import { ref, reactive, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export const TAB_IDS = ['general', 'todo', 'links', 'ideas'];
export const TAB_LABELS = { general: '메모', todo: '할 일', links: '링크', ideas: '아이디어' };
export const TAB_ICONS = { general: '📝', todo: '✅', links: '🔗', ideas: '💡' };

const POSTIT_COLORS = ['#FFF9C4', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2', '#E1BEE7'];
const DEBOUNCE_MS = 300;

const defaultTabs = () =>
  Object.fromEntries(
    TAB_IDS.map((id) => [id, { content: '', bgColor: '#000000', textColor: '#ffffff' }])
  );

// ── Singleton shared state ──
const loaded = ref(false);
const error = ref(null);
const activeTab = ref('general');
const tabs = reactive({ ...defaultTabs() });
const postIts = ref([]);
const connected = ref(false);
const reconnecting = ref(false);

let socket = null;
let saveTimeout = null;
let initialized = false;
let subscriberCount = 0;

function applyData(data) {
  if (!data) return;
  if (data.activeTab != null) activeTab.value = data.activeTab;
  if (data.tabs && typeof data.tabs === 'object') {
    TAB_IDS.forEach((id) => {
      if (data.tabs[id]) {
        tabs[id] = { ...tabs[id], ...data.tabs[id] };
      }
    });
  }
  if (data.postIts && Array.isArray(data.postIts)) {
    postIts.value = data.postIts.map((p) => ({ ...p }));
  }
}

async function fetchMemo() {
  try {
    error.value = null;
    const res = await fetch('/api/memo');
    if (!res.ok) throw new Error(res.statusText);
    applyData(await res.json());
  } catch (e) {
    error.value = e.message || '로드 실패';
    applyData({ activeTab: 'general', tabs: defaultTabs(), postIts: [] });
  } finally {
    loaded.value = true;
  }
}

function connectSocket() {
  if (socket) return;

  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    connected.value = true;
    reconnecting.value = false;
    error.value = null;
  });
  socket.on('disconnect', () => { connected.value = false; });
  socket.on('reconnect_attempt', () => { reconnecting.value = true; });
  socket.on('reconnect_failed', () => {
    reconnecting.value = false;
    error.value = '서버 연결에 실패했습니다. 페이지를 새로고침해 주세요.';
  });
  socket.on('memo:update', applyData);
  socket.on('memo:error', (msg) => { error.value = msg; });
  socket.on('board:refresh', () => { window.location.reload(); });
}

function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function init() {
  if (!initialized) {
    initialized = true;
    fetchMemo();
    connectSocket();
  }
}

// ── Actions ──

function buildPayload(overrides = {}) {
  return {
    activeTab: activeTab.value,
    tabs: { ...tabs },
    postIts: postIts.value.map((p) => ({ ...p })),
    ...overrides,
  };
}

function emitOrFetch(body) {
  if (socket?.connected) {
    socket.emit('memo:save', body);
  } else {
    fetch('/api/memo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then(applyData)
      .catch((e) => (error.value = e.message));
  }
}

function save(payload = null) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => emitOrFetch(payload || buildPayload()), DEBOUNCE_MS);
}

function saveImmediate(payload) {
  clearTimeout(saveTimeout);
  emitOrFetch(payload || buildPayload());
}

function setActiveTab(id) {
  activeTab.value = id;
  save();
}

function updateTabContent(id, content) {
  if (tabs[id]) tabs[id].content = content;
  save();
}

function updateTabColors(id, bgColor, textColor) {
  if (tabs[id]) {
    if (bgColor != null) tabs[id].bgColor = bgColor;
    if (textColor != null) tabs[id].textColor = textColor;
  }
  saveImmediate(buildPayload());
}

function clearTab(id) {
  if (tabs[id]) tabs[id].content = '';
  saveImmediate(buildPayload());
}

function addPostIt(postIt = {}) {
  const colorIdx = postIts.value.length % POSTIT_COLORS.length;
  const newOne = {
    id: postIt.id || `pi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    x: postIt.x ?? 20 + (postIts.value.length % 5) * 30,
    y: postIt.y ?? 20 + (postIts.value.length % 5) * 30,
    content: postIt.content ?? '',
    color: postIt.color ?? POSTIT_COLORS[colorIdx],
    width: postIt.width ?? 220,
    height: postIt.height ?? 160,
    createdAt: postIt.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  postIts.value = [...postIts.value, newOne];
  saveImmediate(buildPayload());
}

function updatePostIt(id, patch) {
  const idx = postIts.value.findIndex((p) => p.id === id);
  if (idx === -1) return;
  postIts.value = postIts.value.slice();
  postIts.value[idx] = { ...postIts.value[idx], ...patch, updatedAt: new Date().toISOString() };
  save();
}

function removePostIt(id) {
  postIts.value = postIts.value.filter((p) => p.id !== id);
  saveImmediate(buildPayload());
}

function refreshBoard() {
  if (socket?.connected) socket.emit('board:refresh');
}

// ── Composable (multiple consumers share the same state) ──

export function useMemo() {
  init();
  subscriberCount++;

  onUnmounted(() => {
    subscriberCount--;
    if (subscriberCount <= 0) {
      destroySocket();
      initialized = false;
      subscriberCount = 0;
    }
  });

  return {
    loaded,
    error,
    connected,
    reconnecting,
    activeTab,
    tabs,
    postIts,
    fetchMemo,
    save,
    saveImmediate,
    setActiveTab,
    updateTabContent,
    updateTabColors,
    clearTab,
    addPostIt,
    updatePostIt,
    removePostIt,
    refreshBoard,
    buildPayload,
  };
}

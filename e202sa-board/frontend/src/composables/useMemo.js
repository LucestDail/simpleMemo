import { ref, reactive, computed, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export const TAB_IDS = ['general', 'todo', 'links', 'ideas'];
export const TAB_LABELS = { general: '메모', todo: '할 일', links: '링크', ideas: '아이디어' };
export const TAB_ICONS  = { general: '📝',   todo: '✅',    links: '🔗',  ideas: '💡'      };

export const POSTIT_COLORS = [
  { name: 'Yellow', hex: '#FFF9C4' },
  { name: 'Pink',   hex: '#F8BBD0' },
  { name: 'Blue',   hex: '#BBDEFB' },
  { name: 'Green',  hex: '#C8E6C9' },
  { name: 'Orange', hex: '#FFE0B2' },
  { name: 'Purple', hex: '#E1BEE7' },
];

export const PRIORITIES = [
  { id: 'none', label: '없음' },
  { id: 'low',  label: '낮음' },
  { id: 'mid',  label: '중간' },
  { id: 'high', label: '높음' },
];

const DEFAULT_DEBOUNCE = 300;

const defaultSettings = () => ({
  debounceMs: 300,
  offlineSync: true,
  theme: 'auto', // 'light' | 'dark' | 'auto'
  boardFontSize: 16,
  autoFullscreen: false,
  backupIntervalHours: 24,
  backupKeep: 10,
});

const defaultTabs = () =>
  Object.fromEntries(
    TAB_IDS.map((id) => [id, { content: '', bgColor: '#1D1B20', textColor: '#E6E0E9' }])
  );

// ── Singleton shared state ──
const loaded = ref(false);
const error = ref(null);
const activeTab = ref('general');
const tabs = reactive({ ...defaultTabs() });
const postIts = ref([]);
const archive = ref([]);
const settings = reactive(defaultSettings());
const connected = ref(false);
const reconnecting = ref(false);
const clients = ref(1);
const serverInfo = ref({ ip: '', url: '', port: 3000 });

let socket = null;
let saveTimeout = null;
let initialized = false;
let subscriberCount = 0;
let offlineQueue = [];

function applyData(data) {
  if (!data) return;
  if (data.activeTab != null) activeTab.value = data.activeTab;
  if (data.tabs && typeof data.tabs === 'object') {
    TAB_IDS.forEach((id) => {
      if (data.tabs[id]) tabs[id] = { ...tabs[id], ...data.tabs[id] };
    });
  }
  if (Array.isArray(data.postIts)) {
    postIts.value = data.postIts.map((p) => ({ ...p }));
  }
  if (Array.isArray(data.archive)) {
    archive.value = data.archive.map((p) => ({ ...p }));
  }
  if (data.settings && typeof data.settings === 'object') {
    Object.assign(settings, { ...defaultSettings(), ...data.settings });
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
    applyData({
      activeTab: 'general',
      tabs: defaultTabs(),
      postIts: [],
      archive: [],
      settings: defaultSettings(),
    });
  } finally {
    loaded.value = true;
  }
}

async function fetchServerInfo() {
  try {
    const res = await fetch('/api/info');
    if (res.ok) serverInfo.value = await res.json();
  } catch {
    // noop
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
    // Flush offline queue
    if (offlineQueue.length) {
      const toSend = offlineQueue[offlineQueue.length - 1];
      offlineQueue = [];
      socket.emit('memo:save', toSend);
    }
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
  socket.on('info:clients', (n) => { clients.value = Math.max(1, Number(n) || 1); });
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
    fetchServerInfo();
    connectSocket();
  }
}

// ── Actions ──
function buildPayload(overrides = {}) {
  return {
    activeTab: activeTab.value,
    tabs: { ...tabs },
    postIts: postIts.value.map((p) => ({ ...p })),
    archive: archive.value.map((p) => ({ ...p })),
    settings: { ...settings },
    ...overrides,
  };
}

function emitOrFetch(body) {
  if (socket?.connected) {
    socket.emit('memo:save', body);
  } else if (settings.offlineSync) {
    offlineQueue.push(body);
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
  const delay = Math.max(0, Number(settings.debounceMs) || DEFAULT_DEBOUNCE);
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => emitOrFetch(payload || buildPayload()), delay);
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
  const tabId = postIt.tab || activeTab.value;
  const sameTab = postIts.value.filter((p) => (p.tab || 'general') === tabId);
  const colorIdx = sameTab.length % POSTIT_COLORS.length;
  const maxZ = postIts.value.reduce((m, p) => Math.max(m, p.zIndex ?? 0), 0);
  const now = new Date().toISOString();
  const newOne = {
    id: postIt.id || `pi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tab: tabId,
    x: postIt.x ?? 24 + (sameTab.length % 6) * 28,
    y: postIt.y ?? 24 + (sameTab.length % 6) * 28,
    width: postIt.width ?? 220,
    height: postIt.height ?? 170,
    title: postIt.title ?? '',
    content: postIt.content ?? '',
    color: postIt.color ?? POSTIT_COLORS[colorIdx].hex,
    pinned: !!postIt.pinned,
    locked: !!postIt.locked,
    minimized: !!postIt.minimized,
    priority: postIt.priority || 'none',
    checklist: postIt.checklist || null,
    zIndex: maxZ + 1,
    createdAt: postIt.createdAt ?? now,
    updatedAt: now,
  };
  postIts.value = [...postIts.value, newOne];
  saveImmediate(buildPayload());
  return newOne;
}

function updatePostIt(id, patch) {
  const idx = postIts.value.findIndex((p) => p.id === id);
  if (idx === -1) return;
  postIts.value = postIts.value.slice();
  postIts.value[idx] = { ...postIts.value[idx], ...patch, updatedAt: new Date().toISOString() };
  save();
}

function bringToFront(id) {
  const maxZ = postIts.value.reduce((m, p) => Math.max(m, p.zIndex ?? 0), 0);
  updatePostIt(id, { zIndex: maxZ + 1 });
}

function removePostIt(id) {
  postIts.value = postIts.value.filter((p) => p.id !== id);
  saveImmediate(buildPayload());
}

function archivePostIt(id) {
  const idx = postIts.value.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const p = postIts.value[idx];
  archive.value = [{ ...p, archivedAt: new Date().toISOString() }, ...archive.value];
  postIts.value = postIts.value.filter((x) => x.id !== id);
  saveImmediate(buildPayload());
}

function restoreArchived(id) {
  const idx = archive.value.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const { archivedAt, ...rest } = archive.value[idx];
  const maxZ = postIts.value.reduce((m, p) => Math.max(m, p.zIndex ?? 0), 0);
  postIts.value = [...postIts.value, { ...rest, zIndex: maxZ + 1, updatedAt: new Date().toISOString() }];
  archive.value = archive.value.filter((x) => x.id !== id);
  saveImmediate(buildPayload());
}

function removeArchived(id) {
  archive.value = archive.value.filter((p) => p.id !== id);
  saveImmediate(buildPayload());
}

function updateSettings(patch) {
  Object.assign(settings, patch);
  saveImmediate(buildPayload());
}

function refreshBoard() {
  if (socket?.connected) socket.emit('board:refresh');
}

// ── Search ──
function searchAll(query, filter = 'all') {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const match = (p) => {
    const hay = `${p.title || ''} ${p.content || ''}`.toLowerCase();
    if (filter !== 'all' && filter !== '#tag' && (p.tab || 'general') !== filter) return false;
    return hay.includes(q);
  };
  const fromPostits = postIts.value.filter(match).map((p) => ({ ...p, _source: 'active' }));
  const fromArchive = archive.value.filter(match).map((p) => ({ ...p, _source: 'archive' }));
  return [...fromPostits, ...fromArchive];
}

function highlight(text, query) {
  if (!text) return '';
  if (!query) return escapeHtml(text);
  const q = query.trim();
  if (!q) return escapeHtml(text);
  const safe = escapeHtml(text);
  const re = new RegExp(escapeRegExp(q), 'gi');
  return safe.replace(re, (m) => `<mark>${m}</mark>`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Export / Import ──
async function exportJson() {
  const data = buildPayload();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simplememo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importJson(file) {
  const txt = await file.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    error.value = 'JSON 파싱 실패';
    return false;
  }
  applyData(data);
  saveImmediate(buildPayload());
  return true;
}

// ── Tab-scoped computed ──
const currentTabPostIts = computed(() =>
  postIts.value
    .filter((p) => (p.tab || 'general') === activeTab.value)
    .slice()
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
);

// ── Composable ──
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
    // state
    loaded,
    error,
    connected,
    reconnecting,
    clients,
    serverInfo,
    activeTab,
    tabs,
    postIts,
    archive,
    settings,
    currentTabPostIts,
    // actions
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
    archivePostIt,
    restoreArchived,
    removeArchived,
    bringToFront,
    updateSettings,
    refreshBoard,
    buildPayload,
    searchAll,
    highlight,
    exportJson,
    importJson,
  };
}

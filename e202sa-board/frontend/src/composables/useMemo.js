import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const TAB_IDS = ['general', 'todo', 'links', 'ideas'];

const defaultTabs = () =>
  Object.fromEntries(
    TAB_IDS.map((id) => [id, { content: '', bgColor: '#000000', textColor: '#ffffff' }])
  );

export function useMemo() {
  const loaded = ref(false);
  const error = ref(null);
  const activeTab = ref('general');
  const tabs = reactive({ ...defaultTabs() });
  const postIts = ref([]);
  let socket = null;
  let saveTimeout = null;
  const DEBOUNCE_MS = 100;

  async function fetchMemo() {
    try {
      error.value = null;
      const res = await fetch('/api/memo');
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      applyData(data);
    } catch (e) {
      error.value = e.message || '로드 실패';
      applyData({ activeTab: 'general', tabs: defaultTabs(), postIts: [] });
    } finally {
      loaded.value = true;
    }
  }

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

  function connectSocket() {
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      // 서버가 연결 시 memo:update 보냄
    });
    socket.on('memo:update', (data) => {
      applyData(data);
    });
    socket.on('memo:error', (msg) => {
      error.value = msg;
    });
    socket.on('board:refresh', () => {
      window.location.reload();
    });
    return () => {
      if (socket) socket.disconnect();
    };
  }

  function buildPayload(overrides = {}) {
    return {
      activeTab: activeTab.value,
      tabs: { ...tabs },
      postIts: postIts.value.map((p) => ({ ...p })),
      ...overrides,
    };
  }

  function save(payload = null) {
    clearTimeout(saveTimeout);
    const send = () => {
      const body = payload || buildPayload();
      if (!socket || !socket.connected) {
        fetch('/api/memo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then((r) => r.json())
          .then(applyData)
          .catch((e) => (error.value = e.message));
        return;
      }
      socket.emit('memo:save', body);
    };
    saveTimeout = setTimeout(send, DEBOUNCE_MS);
  }

  function saveImmediate(payload) {
    clearTimeout(saveTimeout);
    if (socket?.connected) {
      socket.emit('memo:save', payload);
    } else {
      fetch('/api/memo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then(applyData)
        .catch((e) => (error.value = e.message));
    }
  }

  function setActiveTab(id) {
    activeTab.value = id;
    saveImmediate({ activeTab: id });
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
    saveImmediate({ activeTab: activeTab.value, tabs: { [id]: tabs[id] } });
  }

  function clearTab(id) {
    if (tabs[id]) tabs[id].content = '';
    saveImmediate({ activeTab: activeTab.value, tabs: { [id]: tabs[id] } });
  }

  function addPostIt(postIt = {}) {
    const newOne = {
      id: postIt.id || `pi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      x: postIt.x ?? 20,
      y: postIt.y ?? 20,
      content: postIt.content ?? '',
      color: postIt.color ?? '#fff3cd',
      width: postIt.width ?? 220,
      height: postIt.height ?? 180,
    };
    postIts.value = [...postIts.value, newOne];
    saveImmediate(buildPayload({ postIts: postIts.value.map((p) => ({ ...p })) }));
  }

  function updatePostIt(id, patch) {
    const idx = postIts.value.findIndex((p) => p.id === id);
    if (idx === -1) return;
    postIts.value = postIts.value.slice();
    postIts.value[idx] = { ...postIts.value[idx], ...patch };
    save(); // 디바운스로 과도한 전송 방지
  }

  function removePostIt(id) {
    postIts.value = postIts.value.filter((p) => p.id !== id);
    saveImmediate(buildPayload({ postIts: postIts.value.map((p) => ({ ...p })) }));
  }

  function refreshBoard() {
    if (socket?.connected) socket.emit('board:refresh');
  }

  onMounted(() => {
    fetchMemo().then(() => {});
    const disconnect = connectSocket();
    onUnmounted(disconnect);
  });

  return {
    loaded,
    error,
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
  };
}

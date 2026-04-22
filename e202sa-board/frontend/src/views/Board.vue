<template>
  <div
    ref="boardWrapRef"
    class="fixed inset-0 overflow-auto transition-colors duration-300 pt-safe"
    :style="{ backgroundColor: boardBg, color: boardTextColor }"
  >
    <!-- Top Bar (floating pill) -->
    <div class="sticky top-0 z-30 flex flex-wrap items-center gap-2 px-3 py-2 backdrop-blur-md"
         :style="{ background: backdropColor }">
      <router-link
        to="/"
        class="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
        :style="{ color: boardTextColor }"
        title="컨트롤러로 돌아가기"
      >
        ← 컨트롤러
      </router-link>

      <span class="text-sm font-extrabold tracking-tight hidden sm:inline" :style="{ color: boardTextColor }">
        SimpleMemo Board
      </span>

      <!-- Tab pills -->
      <div class="flex gap-1 flex-wrap">
        <button
          v-for="id in TAB_IDS"
          :key="id"
          @click="setActiveTab(id)"
          class="px-2.5 py-1 text-[11px] md:text-xs rounded-full font-semibold transition-all flex items-center gap-1"
          :class="activeTab === id
            ? 'bg-white/90 text-[#6750A4] shadow-m3'
            : 'bg-white/15 hover:bg-white/25'"
          :style="activeTab === id ? {} : { color: boardTextColor }"
        >
          <span>{{ TAB_ICONS[id] }}</span>
          <span>{{ TAB_LABELS[id] }}</span>
        </button>
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <span class="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-white/20"
              :style="{ color: boardTextColor }">
          <span class="w-1.5 h-1.5 rounded-full" :class="connected ? 'bg-green-400' : 'bg-red-400'" />
          {{ connected ? `${clients}기기` : '오프라인' }}
        </span>
        <button
          @click="showQR = !showQR"
          class="px-2 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold"
          :style="{ color: boardTextColor }"
          title="QR 코드"
        >📱 QR</button>
        <button
          @click="toggleFullscreen"
          class="px-2 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold"
          :style="{ color: boardTextColor }"
          title="전체화면"
        >⛶</button>
      </div>
    </div>

    <!-- Grid pattern overlay -->
    <div
      class="pointer-events-none absolute inset-0"
      :style="{
        backgroundImage: `radial-gradient(circle, ${gridDotColor} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        backgroundPosition: '0 0',
        opacity: 0.45,
      }"
    />

    <!-- Free-write text area (optional, small) -->
    <div class="relative z-[1] px-3 md:px-5 pt-2 pb-1">
      <details class="inline-block">
        <summary class="cursor-pointer text-[11px] opacity-60 hover:opacity-100">📝 자유 메모 영역</summary>
        <textarea
          ref="boardTextareaRef"
          v-model="localContent"
          class="w-full mt-2 min-h-[120px] bg-transparent border border-current/20 rounded-m3-sm px-3 py-2 outline-none resize-y whitespace-pre-wrap break-words placeholder:opacity-30"
          :style="{ fontSize: settings.boardFontSize + 'px', lineHeight: '1.7', color: boardTextColor }"
          :placeholder="`${TAB_LABELS[activeTab]} 자유 메모…`"
          @input="onContentInput"
        />
      </details>
    </div>

    <!-- Post-its -->
    <div class="relative z-[1]">
      <div
        v-for="p in currentTabPostIts"
        :key="p.id"
        class="postit-card absolute rounded-m3 flex flex-col overflow-hidden select-none"
        :class="{
          'ring-2 ring-blue-400': draggedId === p.id,
          'ring-2 ring-amber-400': resizingId === p.id,
        }"
        :style="{
          left: (p.x ?? 0) + 'px',
          top: (p.y ?? 0) + 'px',
          width: (p.width ?? 220) + 'px',
          minHeight: p.minimized ? '44px' : (p.height ?? 170) + 'px',
          height: p.minimized ? '44px' : 'auto',
          backgroundColor: p.color || '#FFF9C4',
          color: '#1D1B20',
          zIndex: 2 + (p.zIndex ?? 0),
          boxShadow: '0 2px 8px rgba(0,0,0,.15), 0 6px 18px rgba(0,0,0,.1)',
        }"
        @mousedown="bringToFront(p.id)"
        @touchstart.passive="bringToFront(p.id)"
      >
        <!-- Pin -->
        <span
          v-if="p.pinned"
          class="absolute -top-2 left-1/2 -translate-x-1/2 text-base select-none"
        >📌</span>

        <!-- Priority ribbon -->
        <span
          v-if="p.priority && p.priority !== 'none'"
          class="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
          :class="priorityClass(p.priority)"
        >{{ priorityLabel(p.priority) }}</span>

        <!-- Header (drag handle) -->
        <div
          class="flex items-center justify-between px-3 pt-2.5 pb-1 gap-2"
          :class="p.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'"
          @mousedown="p.locked ? null : onPostItMouseDown($event, p)"
          @touchstart.passive="p.locked ? null : onPostItTouchStart($event, p)"
          @dblclick="!p.locked && toggleMinimize(p)"
        >
          <span class="text-[11px] font-bold truncate flex-1" :class="{ 'pl-10': p.priority && p.priority !== 'none' }">
            {{ p.title || TAB_ICONS[p.tab || 'general'] + ' ' + TAB_LABELS[p.tab || 'general'] }}
          </span>
          <button
            class="text-[10px] hover:opacity-100 opacity-60"
            :title="p.pinned ? '핀 해제' : '핀 고정'"
            @click.stop="updatePostIt(p.id, { pinned: !p.pinned })"
          >{{ p.pinned ? '📌' : '📍' }}</button>
          <button
            class="text-[10px] hover:opacity-100 opacity-60"
            :title="p.locked ? '이동 잠금 해제' : '이동 잠금'"
            @click.stop="updatePostIt(p.id, { locked: !p.locked })"
          >{{ p.locked ? '🔒' : '🔓' }}</button>
          <button
            class="text-[10px] hover:opacity-100 opacity-60"
            :title="p.minimized ? '펼치기' : '최소화'"
            @click.stop="toggleMinimize(p)"
          >{{ p.minimized ? '▢' : '_' }}</button>
        </div>

        <!-- Body -->
        <template v-if="!p.minimized">
          <!-- Edit mode -->
          <div v-if="editingId === p.id" class="flex-1 px-3 pb-2 flex flex-col gap-2">
            <input
              :value="p.title"
              placeholder="제목"
              class="px-2 py-1.5 rounded-m3-xs bg-white/80 text-[#1D1B20] text-xs font-semibold border-0 outline-none"
              @input="updatePostIt(p.id, { title: $event.target.value })"
            />
            <textarea
              :value="p.content"
              class="flex-1 min-h-[70px] w-full p-2 rounded-m3-xs bg-white/80 text-[#1D1B20] text-xs resize-none border-0 outline-none leading-relaxed"
              placeholder="내용"
              @input="updatePostIt(p.id, { content: $event.target.value })"
              @blur="editingId = null"
              @keydown.escape="editingId = null"
            />
            <div class="flex flex-wrap items-center gap-1">
              <button
                v-for="c in POSTIT_COLORS"
                :key="c.hex"
                class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                :class="p.color === c.hex ? 'border-gray-700 scale-110' : 'border-transparent'"
                :style="{ backgroundColor: c.hex }"
                @click.stop="updatePostIt(p.id, { color: c.hex })"
              />
              <span class="mx-1 w-px h-4 bg-black/20" />
              <button
                v-for="pr in PRIORITIES"
                :key="pr.id"
                class="text-[9px] px-1.5 py-0.5 rounded font-bold"
                :class="p.priority === pr.id ? priorityClass(pr.id) + ' ring-1 ring-black/30' : 'bg-black/10 text-black/60'"
                @click.stop="updatePostIt(p.id, { priority: pr.id })"
              >{{ pr.label }}</button>
            </div>
          </div>

          <!-- View mode -->
          <div v-else class="flex-1 px-3 pb-2 overflow-auto" @dblclick="editingId = p.id">
            <!-- Checklist -->
            <ul v-if="Array.isArray(p.checklist) && p.checklist.length" class="flex flex-col gap-1">
              <li
                v-for="(item, i) in p.checklist"
                :key="i"
                class="flex items-start gap-1.5 text-[12px]"
              >
                <input
                  type="checkbox"
                  :checked="!!item.done"
                  class="mt-[2px] accent-m3-primary"
                  @change="toggleChecklist(p, i)"
                />
                <span :class="{ 'line-through opacity-50': item.done }">{{ item.text }}</span>
              </li>
            </ul>
            <!-- Normal content -->
            <p v-else class="text-[12px] whitespace-pre-wrap break-words leading-relaxed">
              {{ p.content || '더블클릭하여 편집' }}
            </p>
          </div>
        </template>

        <!-- Footer -->
        <div class="flex items-center justify-between px-2 py-1 border-t border-black/10 text-[9px] opacity-70">
          <span>{{ formatTime(p.updatedAt) }}</span>
          <div class="flex items-center gap-0.5">
            <button class="px-1 hover:bg-black/10 rounded" title="체크리스트 토글" @click.stop="toggleChecklistMode(p)">☑</button>
            <button class="px-1 hover:bg-black/10 rounded" title="아카이브" @click.stop="archivePostIt(p.id)">📦</button>
            <button class="px-1 text-red-800 hover:bg-red-200/60 rounded" title="삭제" @click.stop="removePostIt(p.id)">✕</button>
          </div>
        </div>

        <!-- Resize handle -->
        <div
          v-if="!p.locked && !p.minimized"
          class="resize-handle"
          @mousedown="onResizeStart($event, p)"
          @touchstart.passive="onResizeTouchStart($event, p)"
        />
      </div>
    </div>

    <!-- Hint -->
    <div
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full px-4 py-1.5 text-[11px] flex gap-2 items-center backdrop-blur-md"
      :style="{ background: 'rgba(255,255,255,.15)', color: boardTextColor }"
    >
      <span>✋ 드래그</span><span>·</span>
      <span>✏️ 더블클릭 편집</span><span>·</span>
      <span>📌 핀 고정</span>
    </div>

    <!-- QR overlay -->
    <transition name="fade">
      <div
        v-if="showQR"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6 animate-fade-in"
        @click.self="showQR = false"
      >
        <div class="bg-white text-[#1D1B20] rounded-m3 p-5 max-w-xs w-full text-center shadow-m3-lg">
          <p class="text-sm font-bold mb-2">📱 이 보드에 접속</p>
          <p class="text-xs text-black/60 mb-3 break-all">{{ serverInfo.url || location.origin }}</p>
          <img
            :src="qrSrc"
            alt="QR Code"
            class="w-48 h-48 mx-auto rounded-m3-xs bg-white"
          />
          <button
            class="mt-3 w-full py-2 rounded-m3-sm bg-[#6750A4] text-white text-sm font-semibold"
            @click="showQR = false"
          >닫기</button>
        </div>
      </div>
    </transition>

    <!-- FAB -->
    <button
      type="button"
      class="fixed bottom-6 right-6 z-30 w-14 h-14 flex items-center justify-center rounded-full shadow-m3-lg text-3xl transition-transform hover:scale-105 active:scale-95"
      style="background-color: #6750A4; color: #FFFFFF;"
      @click="quickAddOnBoard"
      title="포스트잇 추가"
    >+</button>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  useMemo,
  TAB_IDS, TAB_LABELS, TAB_ICONS,
  POSTIT_COLORS, PRIORITIES,
} from '../composables/useMemo';

const {
  activeTab, tabs, postIts, settings, connected, clients, serverInfo, currentTabPostIts,
  setActiveTab, updateTabContent,
  addPostIt, updatePostIt, removePostIt, archivePostIt, bringToFront,
  saveImmediate, buildPayload,
} = useMemo();

const boardWrapRef = ref(null);
const boardTextareaRef = ref(null);
const localContent = ref('');
const editingId = ref(null);
const draggedId = ref(null);
const resizingId = ref(null);
const showQR = ref(false);
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizeStart = null;

watch(
  () => tabs[activeTab.value]?.content,
  (v) => { localContent.value = v ?? ''; },
  { immediate: true }
);

watch(activeTab, () => {
  localContent.value = tabs[activeTab.value]?.content ?? '';
  editingId.value = null;
});

const boardBg = computed(() => tabs[activeTab.value]?.bgColor ?? '#1D1B20');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#E6E0E9');
const backdropColor = computed(() => hexToRgba(boardBg.value, 0.55));
const gridDotColor = computed(() => {
  const isLight = isColorLight(boardBg.value);
  return isLight ? 'rgba(103,80,164,.25)' : 'rgba(255,255,255,.2)';
});

const qrSrc = computed(() => {
  const url = serverInfo.value.url || location.origin;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url + '/board')}`;
});

function hexToRgba(hex, a) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function isColorLight(hex) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}

function onContentInput() {
  if (tabs[activeTab.value]) tabs[activeTab.value].content = localContent.value;
  updateTabContent(activeTab.value, localContent.value);
}

function priorityLabel(id) {
  return PRIORITIES.find((p) => p.id === id)?.label || '';
}
function priorityClass(id) {
  return ({
    low:  'bg-blue-200 text-blue-900',
    mid:  'bg-amber-200 text-amber-900',
    high: 'bg-rose-200 text-rose-900',
  }[id] || 'bg-black/10 text-black/60');
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function toggleMinimize(p) {
  updatePostIt(p.id, { minimized: !p.minimized });
}

function toggleChecklist(p, index) {
  if (!Array.isArray(p.checklist)) return;
  const next = p.checklist.map((it, i) => (i === index ? { ...it, done: !it.done } : it));
  updatePostIt(p.id, { checklist: next });
}

function toggleChecklistMode(p) {
  if (Array.isArray(p.checklist) && p.checklist.length) {
    updatePostIt(p.id, { checklist: null });
  } else {
    const items = (p.content || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ text, done: false }));
    updatePostIt(p.id, { checklist: items.length ? items : [{ text: '할 일', done: false }] });
  }
}

function quickAddOnBoard() {
  const p = addPostIt({ tab: activeTab.value });
  editingId.value = p.id;
}

// ── Drag ──
function getBoardRect() {
  return boardWrapRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
}

function commitDrag() {
  if (draggedId.value) saveImmediate(buildPayload());
  draggedId.value = null;
}

function onPostItMouseDown(e, p) {
  if (e.button !== 0) return;
  e.preventDefault();
  const rect = getBoardRect();
  const scrollLeft = boardWrapRef.value?.scrollLeft ?? 0;
  const scrollTop = boardWrapRef.value?.scrollTop ?? 0;
  dragOffsetX = (e.clientX - rect.left + scrollLeft) - (p.x ?? 0);
  dragOffsetY = (e.clientY - rect.top + scrollTop) - (p.y ?? 0);
  draggedId.value = p.id;
  bringToFront(p.id);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp, { once: true });
}

function onPostItTouchStart(e, p) {
  const t = e.touches?.[0];
  if (!t) return;
  const rect = getBoardRect();
  const scrollLeft = boardWrapRef.value?.scrollLeft ?? 0;
  const scrollTop = boardWrapRef.value?.scrollTop ?? 0;
  dragOffsetX = (t.clientX - rect.left + scrollLeft) - (p.x ?? 0);
  dragOffsetY = (t.clientY - rect.top + scrollTop) - (p.y ?? 0);
  draggedId.value = p.id;
  bringToFront(p.id);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { once: true });
}

function onMouseMove(e) {
  if (!draggedId.value) return;
  e.preventDefault();
  const rect = getBoardRect();
  const scrollLeft = boardWrapRef.value?.scrollLeft ?? 0;
  const scrollTop = boardWrapRef.value?.scrollTop ?? 0;
  const x = Math.max(0, e.clientX - rect.left + scrollLeft - dragOffsetX);
  const y = Math.max(0, e.clientY - rect.top + scrollTop - dragOffsetY);
  updatePostIt(draggedId.value, { x: Math.round(x), y: Math.round(y) });
}

function onTouchMove(e) {
  if (!draggedId.value || !e.touches.length) return;
  e.preventDefault();
  const t = e.touches[0];
  const rect = getBoardRect();
  const scrollLeft = boardWrapRef.value?.scrollLeft ?? 0;
  const scrollTop = boardWrapRef.value?.scrollTop ?? 0;
  const x = Math.max(0, t.clientX - rect.left + scrollLeft - dragOffsetX);
  const y = Math.max(0, t.clientY - rect.top + scrollTop - dragOffsetY);
  updatePostIt(draggedId.value, { x: Math.round(x), y: Math.round(y) });
}

function onMouseUp() {
  window.removeEventListener('mousemove', onMouseMove);
  commitDrag();
}

function onTouchEnd() {
  window.removeEventListener('touchmove', onTouchMove);
  commitDrag();
}

// ── Resize ──
function onResizeStart(e, p) {
  e.stopPropagation();
  e.preventDefault();
  resizingId.value = p.id;
  resizeStart = { x: e.clientX, y: e.clientY, w: p.width || 220, h: p.height || 170 };
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd, { once: true });
}

function onResizeTouchStart(e, p) {
  const t = e.touches?.[0]; if (!t) return;
  resizingId.value = p.id;
  resizeStart = { x: t.clientX, y: t.clientY, w: p.width || 220, h: p.height || 170 };
  window.addEventListener('touchmove', onResizeTouchMove, { passive: false });
  window.addEventListener('touchend', onResizeTouchEnd, { once: true });
}

function onResizeMove(e) {
  if (!resizingId.value || !resizeStart) return;
  const w = Math.max(140, resizeStart.w + (e.clientX - resizeStart.x));
  const h = Math.max(80,  resizeStart.h + (e.clientY - resizeStart.y));
  updatePostIt(resizingId.value, { width: Math.round(w), height: Math.round(h) });
}

function onResizeTouchMove(e) {
  const t = e.touches?.[0]; if (!t || !resizingId.value || !resizeStart) return;
  e.preventDefault();
  const w = Math.max(140, resizeStart.w + (t.clientX - resizeStart.x));
  const h = Math.max(80,  resizeStart.h + (t.clientY - resizeStart.y));
  updatePostIt(resizingId.value, { width: Math.round(w), height: Math.round(h) });
}

function onResizeEnd() {
  window.removeEventListener('mousemove', onResizeMove);
  if (resizingId.value) saveImmediate(buildPayload());
  resizingId.value = null; resizeStart = null;
}

function onResizeTouchEnd() {
  window.removeEventListener('touchmove', onResizeTouchMove);
  if (resizingId.value) saveImmediate(buildPayload());
  resizingId.value = null; resizeStart = null;
}

// ── Fullscreen ──
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (e) { /* user denied */ }
}

onMounted(() => {
  if (settings.autoFullscreen) toggleFullscreen();
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('mousemove', onResizeMove);
  window.removeEventListener('touchmove', onResizeTouchMove);
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

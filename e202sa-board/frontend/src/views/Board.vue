<template>
  <div
    ref="boardWrapRef"
    class="fixed inset-0 overflow-auto transition-colors duration-300 pt-safe"
    :style="{ backgroundColor: boardBg, color: boardTextColor }"
    @click.self="closeMenu"
  >
    <!-- Top bar (compact) -->
    <div
      class="sticky top-0 z-30 flex items-center gap-2 px-3 py-2 backdrop-blur-md"
      :style="{ background: backdropColor }"
    >
      <router-link
        to="/"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors text-sm"
        :style="{ color: boardTextColor }"
        title="컨트롤러"
      >←</router-link>

      <div class="flex gap-1 flex-1 overflow-x-auto hide-scrollbar">
        <button
          v-for="id in TAB_IDS"
          :key="id"
          @click="setActiveTab(id)"
          class="px-3 py-1 text-xs rounded-full font-semibold whitespace-nowrap transition-all flex items-center gap-1"
          :class="activeTab === id ? 'bg-white/90 text-[#6750A4] shadow-m3' : 'bg-white/10 hover:bg-white/20'"
          :style="activeTab === id ? {} : { color: boardTextColor }"
        >
          <span>{{ TAB_ICONS[id] }}</span>
          <span class="hidden sm:inline">{{ TAB_LABELS[id] }}</span>
          <span
            v-if="countPerTab[id]"
            class="text-[10px] px-1.5 rounded-full"
            :class="activeTab === id ? 'bg-[#6750A4]/15' : 'bg-white/20'"
          >{{ countPerTab[id] }}</span>
        </button>
      </div>

      <div class="relative">
        <button
          @click="menuOpen = !menuOpen"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors text-base"
          :style="{ color: boardTextColor }"
          title="메뉴"
        >⋯</button>

        <transition name="pop">
          <div
            v-if="menuOpen"
            class="absolute right-0 top-10 min-w-[180px] bg-white dark:bg-[#2B2930] rounded-xl shadow-m3-lg overflow-hidden text-[13px] text-[#1D1B20] dark:text-[#E6E0E9]"
            @click.stop
          >
            <div class="px-3 py-2 flex items-center gap-2 text-[11px] text-black/60 dark:text-white/60 border-b border-black/5 dark:border-white/10">
              <span class="w-1.5 h-1.5 rounded-full" :class="connected ? 'bg-emerald-500' : 'bg-red-400'" />
              <span>{{ connected ? `${clients}기기 연결` : '오프라인' }}</span>
            </div>
            <button class="w-full text-left px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2" @click="showQR = true; menuOpen = false">
              <span>📱</span> QR 코드
            </button>
            <button class="w-full text-left px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2" @click="toggleFullscreen(); menuOpen = false">
              <span>⛶</span> 전체화면
            </button>
            <button class="w-full text-left px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2" @click="refreshBoard(); menuOpen = false">
              <span>🔄</span> 모든 기기 새로고침
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- Grid pattern -->
    <div
      class="pointer-events-none absolute inset-0 z-0"
      :style="{
        backgroundImage: `radial-gradient(circle, ${gridDotColor} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        opacity: 0.45,
      }"
    />

    <!-- Empty state -->
    <div
      v-if="currentTabPostIts.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
      :style="{ color: boardTextColor }"
    >
      <div class="text-center opacity-50">
        <p class="text-2xl mb-1">{{ TAB_ICONS[activeTab] }}</p>
        <p class="text-sm">비어 있는 보드</p>
        <p class="text-[11px] mt-1">우측 하단 + 버튼으로 추가</p>
      </div>
    </div>

    <!-- Post-its -->
    <div
      v-for="p in currentTabPostIts"
      :key="p.id"
      class="postit-card absolute rounded-xl flex flex-col overflow-visible select-none group"
      :class="{
        'ring-2 ring-blue-400': draggedId === p.id,
        'ring-2 ring-amber-400': resizingId === p.id,
      }"
      :style="{
        left: (p.x ?? 0) + 'px',
        top: (p.y ?? 0) + 'px',
        width: (p.width ?? 220) + 'px',
        minHeight: (p.height ?? 160) + 'px',
        backgroundColor: p.color || '#FFF9C4',
        color: '#1D1B20',
        zIndex: 2 + (p.zIndex ?? 0),
        boxShadow: '0 2px 8px rgba(0,0,0,.15), 0 6px 18px rgba(0,0,0,.1)',
      }"
      @mousedown="bringToFront(p.id)"
      @touchstart.passive="bringToFront(p.id)"
    >
      <!-- Pin marker -->
      <span v-if="p.pinned" class="absolute -top-2 left-1/2 -translate-x-1/2 text-base">📌</span>

      <!-- Drag surface (fills card) -->
      <div
        class="flex-1 px-3 py-2.5 overflow-auto"
        :class="editingId === p.id ? '' : 'cursor-grab active:cursor-grabbing'"
        @mousedown="editingId !== p.id && onPostItMouseDown($event, p)"
        @touchstart.passive="editingId !== p.id && onPostItTouchStart($event, p)"
        @dblclick="startEdit(p)"
      >
        <!-- View mode -->
        <template v-if="editingId !== p.id">
          <p v-if="p.title" class="text-[13px] font-bold mb-1 truncate">{{ p.title }}</p>
          <p class="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
            {{ p.content || '더블클릭하여 편집' }}
          </p>
        </template>

        <!-- Edit mode -->
        <div v-else class="flex flex-col gap-2 h-full" @mousedown.stop @touchstart.stop>
          <input
            :value="p.title"
            placeholder="제목 (선택)"
            class="px-2 py-1 rounded bg-white/80 text-[13px] font-bold border-0 outline-none"
            @input="updatePostIt(p.id, { title: $event.target.value })"
          />
          <textarea
            :value="p.content"
            rows="3"
            class="flex-1 min-h-[64px] w-full p-2 rounded bg-white/80 text-[13px] resize-none border-0 outline-none leading-relaxed"
            placeholder="내용"
            @input="updatePostIt(p.id, { content: $event.target.value })"
            @keydown.escape="editingId = null"
          />
          <div class="flex items-center gap-1 flex-wrap">
            <button
              v-for="c in POSTIT_COLORS"
              :key="c.hex"
              class="w-5 h-5 rounded-full transition-transform active:scale-90"
              :class="p.color === c.hex ? 'ring-2 ring-black/60 scale-110' : 'ring-1 ring-black/15'"
              :style="{ backgroundColor: c.hex }"
              @click="updatePostIt(p.id, { color: c.hex })"
            />
            <button
              class="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded hover:bg-black/10"
              @click="editingId = null"
            >완료</button>
          </div>
        </div>
      </div>

      <!-- Footer: time + quick actions (subtle, show on hover) -->
      <div class="flex items-center justify-between px-2 pb-1.5 text-[10px] opacity-60">
        <span>{{ formatTime(p.updatedAt) }}</span>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button class="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center" title="편집" @click.stop="startEdit(p)">✏️</button>
          <button class="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center" :title="p.pinned ? '핀 해제' : '핀 고정'" @click.stop="updatePostIt(p.id, { pinned: !p.pinned })">
            {{ p.pinned ? '📌' : '📍' }}
          </button>
          <button class="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center" title="아카이브" @click.stop="archivePostIt(p.id)">📦</button>
          <button class="w-6 h-6 rounded-full text-red-700 hover:bg-red-200/70 flex items-center justify-center" title="삭제" @click.stop="removePostIt(p.id)">✕</button>
        </div>
      </div>

      <!-- Resize handle -->
      <div
        v-if="!p.locked"
        class="resize-handle"
        @mousedown="onResizeStart($event, p)"
        @touchstart.passive="onResizeTouchStart($event, p)"
      />
    </div>

    <!-- QR overlay -->
    <transition name="fade">
      <div
        v-if="showQR"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6"
        @click.self="showQR = false"
      >
        <div class="bg-white text-[#1D1B20] rounded-2xl p-5 max-w-xs w-full text-center shadow-m3-lg">
          <p class="text-sm font-bold mb-2">📱 이 보드에 접속</p>
          <p class="text-xs text-black/60 mb-3 break-all">{{ serverInfo.url || location.origin }}</p>
          <img :src="qrSrc" alt="QR" class="w-48 h-48 mx-auto bg-white" />
          <button class="mt-3 w-full py-2 rounded-full bg-[#6750A4] text-white text-sm font-semibold" @click="showQR = false">닫기</button>
        </div>
      </div>
    </transition>

    <!-- FAB -->
    <button
      type="button"
      class="fixed bottom-5 right-5 z-30 w-14 h-14 flex items-center justify-center rounded-2xl shadow-m3-lg text-3xl transition-transform hover:scale-105 active:scale-95"
      style="background-color: #6750A4; color: #FFFFFF;"
      @click="quickAddOnBoard"
      title="포스트잇 추가"
    >+</button>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import {
  useMemo,
  TAB_IDS, TAB_LABELS, TAB_ICONS,
  POSTIT_COLORS,
} from '../composables/useMemo';

const {
  activeTab, tabs, postIts, settings, connected, clients, serverInfo, currentTabPostIts,
  setActiveTab, addPostIt, updatePostIt, removePostIt, archivePostIt, bringToFront,
  saveImmediate, buildPayload, refreshBoard,
} = useMemo();

const boardWrapRef = ref(null);
const editingId = ref(null);
const draggedId = ref(null);
const resizingId = ref(null);
const showQR = ref(false);
const menuOpen = ref(false);
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizeStart = null;

const boardBg = computed(() => tabs[activeTab.value]?.bgColor ?? '#1D1B20');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#E6E0E9');
const backdropColor = computed(() => hexToRgba(boardBg.value, 0.6));
const gridDotColor = computed(() => isColorLight(boardBg.value) ? 'rgba(103,80,164,.25)' : 'rgba(255,255,255,.18)');

const countPerTab = computed(() => {
  const map = Object.fromEntries(TAB_IDS.map((id) => [id, 0]));
  for (const p of postIts.value) map[p.tab || 'general'] = (map[p.tab || 'general'] || 0) + 1;
  return map;
});

const qrSrc = computed(() => {
  const url = serverInfo.value.url || location.origin;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url + '/board')}`;
});

function hexToRgba(hex, a) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function isColorLight(hex) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function startEdit(p) {
  editingId.value = p.id;
}
function closeMenu() { menuOpen.value = false; }

function quickAddOnBoard() {
  const p = addPostIt({ tab: activeTab.value });
  editingId.value = p.id;
}

// ── Drag ──
function getBoardRect() { return boardWrapRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 }; }
function commitDrag() { if (draggedId.value) saveImmediate(buildPayload()); draggedId.value = null; }

function onPostItMouseDown(e, p) {
  if (e.button !== 0) return;
  if (p.locked) return;
  e.preventDefault();
  const rect = getBoardRect();
  const sl = boardWrapRef.value?.scrollLeft ?? 0;
  const st = boardWrapRef.value?.scrollTop ?? 0;
  dragOffsetX = (e.clientX - rect.left + sl) - (p.x ?? 0);
  dragOffsetY = (e.clientY - rect.top + st) - (p.y ?? 0);
  draggedId.value = p.id;
  bringToFront(p.id);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp, { once: true });
}
function onPostItTouchStart(e, p) {
  if (p.locked) return;
  const t = e.touches?.[0]; if (!t) return;
  const rect = getBoardRect();
  const sl = boardWrapRef.value?.scrollLeft ?? 0;
  const st = boardWrapRef.value?.scrollTop ?? 0;
  dragOffsetX = (t.clientX - rect.left + sl) - (p.x ?? 0);
  dragOffsetY = (t.clientY - rect.top + st) - (p.y ?? 0);
  draggedId.value = p.id;
  bringToFront(p.id);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { once: true });
}
function onMouseMove(e) {
  if (!draggedId.value) return; e.preventDefault();
  const rect = getBoardRect();
  const sl = boardWrapRef.value?.scrollLeft ?? 0;
  const st = boardWrapRef.value?.scrollTop ?? 0;
  const x = Math.max(0, e.clientX - rect.left + sl - dragOffsetX);
  const y = Math.max(0, e.clientY - rect.top + st - dragOffsetY);
  updatePostIt(draggedId.value, { x: Math.round(x), y: Math.round(y) });
}
function onTouchMove(e) {
  if (!draggedId.value || !e.touches.length) return; e.preventDefault();
  const t = e.touches[0];
  const rect = getBoardRect();
  const sl = boardWrapRef.value?.scrollLeft ?? 0;
  const st = boardWrapRef.value?.scrollTop ?? 0;
  const x = Math.max(0, t.clientX - rect.left + sl - dragOffsetX);
  const y = Math.max(0, t.clientY - rect.top + st - dragOffsetY);
  updatePostIt(draggedId.value, { x: Math.round(x), y: Math.round(y) });
}
function onMouseUp() { window.removeEventListener('mousemove', onMouseMove); commitDrag(); }
function onTouchEnd() { window.removeEventListener('touchmove', onTouchMove); commitDrag(); }

// ── Resize ──
function onResizeStart(e, p) {
  e.stopPropagation(); e.preventDefault();
  resizingId.value = p.id;
  resizeStart = { x: e.clientX, y: e.clientY, w: p.width || 220, h: p.height || 160 };
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd, { once: true });
}
function onResizeTouchStart(e, p) {
  const t = e.touches?.[0]; if (!t) return;
  resizingId.value = p.id;
  resizeStart = { x: t.clientX, y: t.clientY, w: p.width || 220, h: p.height || 160 };
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

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (_) { /* noop */ }
}

onMounted(() => { if (settings.autoFullscreen) toggleFullscreen(); });
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
.pop-enter-active { transition: transform .15s ease-out, opacity .15s; transform-origin: top right; }
.pop-leave-active { transition: transform .1s ease-in, opacity .1s; transform-origin: top right; }
.pop-enter-from, .pop-leave-to { transform: scale(.9); opacity: 0; }
</style>

<template>
  <div
    ref="boardWrapRef"
    class="board-wrap fixed inset-0 overflow-hidden flex flex-col p-4 md:p-6 transition-colors"
    :style="{ backgroundColor: boardBg }"
  >
    <!-- 탭 선택 + 보드 메모 편집 영역 -->
    <div class="flex flex-wrap items-center gap-2 mb-3 z-20">
      <button
        v-for="id in tabIds"
        :key="id"
        type="button"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
        :class="activeTab === id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'"
        :style="{ color: activeTab === id ? boardTextColor : undefined }"
        @click="setActiveTab(id)"
      >
        {{ tabLabels[id] }}
      </button>
    </div>

    <!-- 블랙보드 메모: 보드에서 직접 입력/수정/삭제 -->
    <div
      class="board-text-area flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-full gap-3"
      :style="{ color: boardTextColor }"
    >
      <textarea
        ref="boardTextareaRef"
        v-model="localTabContent"
        class="w-full flex-1 min-h-[100px] max-w-4xl mx-auto bg-transparent border border-white/20 rounded px-3 py-2 outline-none resize-none text-center break-words whitespace-pre-wrap placeholder:opacity-50"
        :style="{ fontSize: boardFontSize + 'px', color: boardTextColor }"
        :placeholder="'메모 입력 (Markdown: - [ ] 체크박스, - 불렛)'"
        @input="onBoardContentInput"
      />
      <!-- 마크다운 미리보기 -->
      <div
        v-if="localTabContent.trim()"
        class="markdown-preview w-full max-w-4xl mx-auto text-left rounded p-3 bg-black/20"
        :style="{ color: boardTextColor, fontSize: Math.min(18, boardFontSize) + 'px' }"
      >
        <div class="whitespace-pre-wrap break-words" v-html="tabContentHtml" />
      </div>
    </div>

    <!-- 빈 상태 안내 (포스트잇만 있을 때) -->
    <span
      v-if="!localTabContent.trim() && postIts.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 italic"
      :style="{ color: boardTextColor, fontSize: '18px' }"
    >
      메모가 비어 있습니다. 위 입력창에 입력하거나 컨트롤러에서 포스트잇을 추가하세요.
    </span>

    <!-- 포스트잇: 드래그로 위치 변경, 드롭 시 위치 저장 -->
    <div
      v-for="p in postIts"
      :key="p.id"
      class="postit absolute rounded-lg p-3 shadow-lg overflow-auto z-10 select-none cursor-grab active:cursor-grabbing"
      :class="{ 'ring-2 ring-white/50': draggedId === p.id }"
      :style="{
        left: (p.x ?? 0) + 'px',
        top: (p.y ?? 0) + 'px',
        width: (p.width ?? 220) + 'px',
        minHeight: (p.height ?? 120) + 'px',
        backgroundColor: p.color || '#fff3cd',
        color: '#1a1a1a',
      }"
      draggable="false"
      @mousedown="onPostItMouseDown($event, p)"
      @touchstart.passive="onPostItTouchStart($event, p)"
    >
      <div class="text-sm whitespace-pre-wrap break-words pointer-events-none">{{ p.content || '내용 없음' }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMemo } from '../composables/useMemo';

const tabIds = ['general', 'todo', 'links', 'ideas'];
const tabLabels = { general: 'General', todo: 'To-Do', links: 'Links', ideas: 'Ideas' };

const {
  loaded,
  activeTab,
  tabs,
  postIts,
  setActiveTab,
  updateTabContent,
  updatePostIt,
  saveImmediate,
} = useMemo();

const boardWrapRef = ref(null);
const boardTextareaRef = ref(null);

// 보드에서 편집하는 텍스트: 로컬 복사본, 동기화 후 서버 값으로 갱신
const localTabContent = ref('');
watch(
  () => [activeTab.value, tabs[activeTab.value]?.content],
  () => {
    localTabContent.value = tabs[activeTab.value]?.content ?? '';
  },
  { immediate: true }
);

const boardBg = computed(() => tabs[activeTab.value]?.bgColor ?? '#000000');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#ffffff');

// 글씨 크기 축소: 14~42px, 글자 수 많으면 더 작게
const MIN_FONT_PX = 14;
const MAX_FONT_PX = 42;
const BASE_LENGTH = 120;
const boardFontSize = computed(() => {
  const len = (localTabContent.value || '').trim().length;
  if (len <= 0) return 24;
  const scale = Math.max(0.4, Math.min(1, BASE_LENGTH / Math.max(1, len)));
  return Math.round(MIN_FONT_PX + (MAX_FONT_PX - MIN_FONT_PX) * scale);
});

function onBoardContentInput() {
  const id = activeTab.value;
  if (tabs[id]) tabs[id].content = localTabContent.value;
  updateTabContent(id, localTabContent.value);
}

// 마크다운 → HTML (체크박스, 불렛, 강조)
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function simpleMarkdownToHtml(text) {
  if (!text || !String(text).trim()) return '';
  const lines = String(text).split('\n');
  const out = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // - [ ] / - [x] / - [X] (공백 유연)
    const checkbox = trimmed.match(/^-\s*\[\s*([xX ])\s*\]\s*(.*)$/);
    // - 불렛
    const bullet = trimmed.match(/^-\s+(.+)$/);
    if (checkbox) {
      if (!inList) {
        out.push('<ul class="list-none pl-0 my-2 space-y-1">');
        inList = true;
      }
      const checked = checkbox[1].toLowerCase() === 'x';
      const label = escapeHtml(checkbox[2].trim());
      out.push(
        `<li class="flex items-center gap-2"><input type="checkbox" ${checked ? 'checked' : ''} disabled class="w-4 h-4 flex-shrink-0 rounded"> <span class="${checked ? 'line-through opacity-70' : ''}">${label}</span></li>`
      );
    } else if (bullet) {
      if (!inList) {
        out.push('<ul class="list-none pl-0 my-2 space-y-1">');
        inList = true;
      }
      out.push('<li class="ml-2">' + escapeHtml(bullet[1]) + '</li>');
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (trimmed) out.push('<p class="my-1">' + escapeHtml(trimmed) + '</p>');
      else out.push('<br>');
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

const tabContentHtml = computed(() => simpleMarkdownToHtml(localTabContent.value));

// ---- 포스트잇 드래그 ----
const draggedId = ref(null);
let dragOffsetX = 0; // 마우스가 포스트잇 안에서 클릭한 위치
let dragOffsetY = 0;

function getBoardRect() {
  return boardWrapRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
}

function onPostItMouseDown(e, p) {
  if (e.button !== 0) return;
  e.preventDefault();
  const rect = getBoardRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const px = p.x ?? 0;
  const py = p.y ?? 0;
  dragOffsetX = mx - px;
  dragOffsetY = my - py;
  startDrag(p);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp, { once: true });
}

function onPostItTouchStart(e, p) {
  const t = e.touches?.[0];
  if (!t) return;
  const rect = getBoardRect();
  const mx = t.clientX - rect.left;
  const my = t.clientY - rect.top;
  const px = p.x ?? 0;
  const py = p.y ?? 0;
  dragOffsetX = mx - px;
  dragOffsetY = my - py;
  startDrag(p);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { once: true });
}

function startDrag(p) {
  draggedId.value = p.id;
}

function onMouseMove(e) {
  if (!draggedId.value) return;
  e.preventDefault();
  const rect = getBoardRect();
  const x = Math.max(0, e.clientX - rect.left - dragOffsetX);
  const y = Math.max(0, e.clientY - rect.top - dragOffsetY);
  updatePostIt(draggedId.value, { x: Math.round(x), y: Math.round(y) });
}

function onTouchMove(e) {
  if (!draggedId.value || !e.touches.length) return;
  e.preventDefault();
  const t = e.touches[0];
  const rect = getBoardRect();
  const x = Math.max(0, t.clientX - rect.left - dragOffsetX);
  const y = Math.max(0, t.clientY - rect.top - dragOffsetY);
  updatePostIt(draggedId.value, { x: Math.round(x), y: Math.round(y) });
}

function onMouseUp() {
  window.removeEventListener('mousemove', onMouseMove);
  if (draggedId.value) {
    saveImmediate({ activeTab: activeTab.value, tabs: { ...tabs }, postIts: postIts.value.map((p) => ({ ...p })) });
  }
  draggedId.value = null;
}

function onTouchEnd() {
  window.removeEventListener('touchmove', onTouchMove);
  if (draggedId.value) {
    saveImmediate({ activeTab: activeTab.value, tabs: { ...tabs }, postIts: postIts.value.map((p) => ({ ...p })) });
  }
  draggedId.value = null;
}
</script>

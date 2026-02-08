<template>
  <div
    ref="boardWrapRef"
    class="board-wrap fixed inset-0 overflow-auto transition-colors"
    :style="{ backgroundColor: boardBg, color: boardTextColor }"
  >
    <!-- 좌측 상단부터 메모: 작은 글씨로 주욱 -->
    <div class="board-memo p-4 md:p-6 text-left">
      <textarea
        ref="boardTextareaRef"
        v-model="localContent"
        class="w-full min-h-[60vh] bg-transparent border-none outline-none resize-none whitespace-pre-wrap break-words placeholder:opacity-50"
        :style="{ fontSize: memoFontSize + 'px', color: boardTextColor }"
        placeholder="메모 입력..."
        @input="onContentInput"
      />
    </div>

    <!-- 포스트잇: 추가 버튼 + 드래그·편집·삭제 -->
    <div class="fixed bottom-4 right-4 z-30">
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-medium shadow-lg hover:bg-amber-400"
        @click="addPostIt()"
      >
        + 포스트잇
      </button>
    </div>

    <div
      v-for="p in postIts"
      :key="p.id"
      class="postit absolute rounded-lg shadow-lg z-10 flex flex-col"
      :class="{ 'ring-2 ring-white/60': draggedId === p.id }"
      :style="{
        left: (p.x ?? 0) + 'px',
        top: (p.y ?? 0) + 'px',
        width: (p.width ?? 200) + 'px',
        minHeight: (p.height ?? 100) + 'px',
        backgroundColor: p.color || '#fff3cd',
        color: '#1a1a1a',
      }"
    >
      <div
        v-if="editingId !== p.id"
        class="flex-1 p-2 cursor-grab active:cursor-grabbing select-none overflow-auto"
        @mousedown="onPostItMouseDown($event, p)"
        @touchstart.passive="onPostItTouchStart($event, p)"
      >
        <div class="text-sm whitespace-pre-wrap break-words" @dblclick="editingId = p.id">
          {{ p.content || '더블클릭하여 편집' }}
        </div>
      </div>
      <div v-else class="flex-1 p-2 flex flex-col">
        <textarea
          :value="p.content"
          class="flex-1 min-h-[60px] w-full p-2 rounded bg-white/90 text-gray-900 text-sm resize-none border-0 outline-none"
          placeholder="내용"
          @input="onPostItEditContent(p.id, $event)"
          @blur="editingId = null"
        />
      </div>
      <div class="flex items-center justify-end gap-1 p-1 border-t border-black/10">
        <input
          v-if="editingId === p.id"
          type="color"
          :value="p.color"
          class="w-6 h-6 rounded cursor-pointer"
          @input="updatePostIt(p.id, { color: $event.target.value })"
        />
        <button
          type="button"
          class="px-2 py-0.5 text-xs text-red-600 hover:bg-red-100 rounded"
          @click="removePostIt(p.id)"
        >
          삭제
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMemo } from '../composables/useMemo';

const MEMO_ID = 'general';

const {
  tabs,
  postIts,
  updateTabContent,
  addPostIt,
  updatePostIt,
  removePostIt,
  saveImmediate,
} = useMemo();

const boardWrapRef = ref(null);
const boardTextareaRef = ref(null);
const localContent = ref('');
const editingId = ref(null);
const draggedId = ref(null);
let dragOffsetX = 0;
let dragOffsetY = 0;

watch(
  () => tabs[MEMO_ID]?.content,
  (v) => { localContent.value = v ?? ''; },
  { immediate: true }
);

const boardBg = computed(() => tabs[MEMO_ID]?.bgColor ?? '#000000');
const boardTextColor = computed(() => tabs[MEMO_ID]?.textColor ?? '#ffffff');
const memoFontSize = 14; // 좌상단 주욱 적는 용도로 작은 고정 크기

function onContentInput() {
  if (tabs[MEMO_ID]) tabs[MEMO_ID].content = localContent.value;
  updateTabContent(MEMO_ID, localContent.value);
}

function onPostItEditContent(id, e) {
  updatePostIt(id, { content: e.target.value });
}

function getBoardRect() {
  return boardWrapRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
}

function onPostItMouseDown(e, p) {
  if (e.button !== 0) return;
  e.preventDefault();
  const rect = getBoardRect();
  dragOffsetX = (e.clientX - rect.left) - (p.x ?? 0);
  dragOffsetY = (e.clientY - rect.top) - (p.y ?? 0);
  draggedId.value = p.id;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp, { once: true });
}

function onPostItTouchStart(e, p) {
  const t = e.touches?.[0];
  if (!t) return;
  const rect = getBoardRect();
  dragOffsetX = (t.clientX - rect.left) - (p.x ?? 0);
  dragOffsetY = (t.clientY - rect.top) - (p.y ?? 0);
  draggedId.value = p.id;
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { once: true });
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
    saveImmediate({
      activeTab: MEMO_ID,
      tabs: { ...tabs },
      postIts: postIts.value.map((p) => ({ ...p })),
    });
  }
  draggedId.value = null;
}

function onTouchEnd() {
  window.removeEventListener('touchmove', onTouchMove);
  if (draggedId.value) {
    saveImmediate({
      activeTab: MEMO_ID,
      tabs: { ...tabs },
      postIts: postIts.value.map((p) => ({ ...p })),
    });
  }
  draggedId.value = null;
}
</script>

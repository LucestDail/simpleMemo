<template>
  <div
    ref="boardWrapRef"
    class="board-wrap fixed inset-0 top-14 overflow-auto transition-colors duration-300"
    :style="{ backgroundColor: boardBg, color: boardTextColor }"
  >
    <!-- Tab indicator (small, top-left) -->
    <div class="fixed top-16 left-3 z-20 flex gap-1">
      <button
        v-for="id in TAB_IDS"
        :key="id"
        class="px-2 py-1 text-xs rounded-m3-sm font-medium transition-all"
        :class="activeTab === id
          ? 'bg-white/20 backdrop-blur-sm shadow-sm'
          : 'opacity-40 hover:opacity-70'"
        :style="{ color: boardTextColor }"
        @click="setActiveTab(id)"
      >
        {{ TAB_ICONS[id] }} {{ TAB_LABELS[id] }}
      </button>
    </div>

    <!-- Memo text area -->
    <div class="p-4 pt-12 md:p-6 md:pt-14">
      <textarea
        ref="boardTextareaRef"
        v-model="localContent"
        class="w-full min-h-[60vh] bg-transparent border-none outline-none resize-none whitespace-pre-wrap break-words placeholder:opacity-30"
        :style="{ fontSize: '14px', lineHeight: '1.8', color: boardTextColor }"
        :placeholder="`${TAB_LABELS[activeTab]} 입력...`"
        @input="onContentInput"
      />
    </div>

    <!-- Post-its -->
    <div
      v-for="p in postIts"
      :key="p.id"
      class="postit-card absolute rounded-m3 z-10 flex flex-col overflow-hidden"
      :class="{ 'ring-2 ring-m3-primary/60 dark:ring-m3-primary-dark/60': draggedId === p.id }"
      :style="{
        left: (p.x ?? 0) + 'px',
        top: (p.y ?? 0) + 'px',
        width: (p.width ?? 220) + 'px',
        minHeight: (p.height ?? 160) + 'px',
        backgroundColor: p.color || '#FFF9C4',
        color: '#1D1B20',
      }"
      style="box-shadow: 0 2px 6px 2px rgba(0,0,0,.15), 0 1px 2px 0 rgba(0,0,0,.3)"
    >
      <!-- Drag handle -->
      <div
        v-if="editingId !== p.id"
        class="flex-1 p-3 cursor-grab active:cursor-grabbing select-none overflow-auto"
        @mousedown="onPostItMouseDown($event, p)"
        @touchstart.passive="onPostItTouchStart($event, p)"
      >
        <div class="text-sm whitespace-pre-wrap break-words leading-relaxed" @dblclick="editingId = p.id">
          {{ p.content || '더블클릭하여 편집' }}
        </div>
      </div>

      <!-- Edit mode -->
      <div v-else class="flex-1 p-3 flex flex-col">
        <textarea
          :value="p.content"
          class="flex-1 min-h-[80px] w-full p-2 rounded-m3-sm bg-white/80 text-[#1D1B20] text-sm resize-none border-0 outline-none leading-relaxed"
          placeholder="내용"
          @input="onPostItEditContent(p.id, $event)"
          @blur="editingId = null"
          @keydown.escape="editingId = null"
        />
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-2 py-1.5 border-t border-black/8">
        <span v-if="p.updatedAt" class="text-[10px] opacity-40">
          {{ formatTime(p.updatedAt) }}
        </span>
        <span v-else />
        <div class="flex items-center gap-1">
          <div v-if="editingId === p.id" class="flex gap-0.5">
            <button
              v-for="c in postitColors"
              :key="c"
              class="w-4 h-4 rounded-full border transition-transform hover:scale-125"
              :class="p.color === c ? 'border-gray-600 scale-110' : 'border-transparent'"
              :style="{ backgroundColor: c }"
              @click.stop="updatePostIt(p.id, { color: c })"
            />
          </div>
          <button
            type="button"
            class="px-1.5 py-0.5 text-[11px] text-red-700/70 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
            @click="removePostIt(p.id)"
          >
            삭제
          </button>
        </div>
      </div>
    </div>

    <!-- Add post-it FAB -->
    <button
      type="button"
      class="fixed bottom-6 right-6 z-30 w-14 h-14 flex items-center justify-center rounded-m3 shadow-m3-lg text-2xl transition-transform hover:scale-105 active:scale-95"
      style="background-color: #6750A4; color: #FFFFFF;"
      @click="addPostIt()"
      title="포스트잇 추가"
    >
      +
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMemo, TAB_IDS, TAB_LABELS, TAB_ICONS } from '../composables/useMemo';

const postitColors = ['#FFF9C4', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2', '#E1BEE7'];

const {
  activeTab,
  tabs,
  postIts,
  setActiveTab,
  updateTabContent,
  addPostIt,
  updatePostIt,
  removePostIt,
  saveImmediate,
  buildPayload,
} = useMemo();

const boardWrapRef = ref(null);
const boardTextareaRef = ref(null);
const localContent = ref('');
const editingId = ref(null);
const draggedId = ref(null);
let dragOffsetX = 0;
let dragOffsetY = 0;

watch(
  () => tabs[activeTab.value]?.content,
  (v) => { localContent.value = v ?? ''; },
  { immediate: true }
);

watch(activeTab, () => {
  localContent.value = tabs[activeTab.value]?.content ?? '';
});

const boardBg = computed(() => tabs[activeTab.value]?.bgColor ?? '#000000');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#ffffff');

function onContentInput() {
  if (tabs[activeTab.value]) tabs[activeTab.value].content = localContent.value;
  updateTabContent(activeTab.value, localContent.value);
}

function onPostItEditContent(id, e) {
  updatePostIt(id, { content: e.target.value });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function getBoardRect() {
  return boardWrapRef.value?.getBoundingClientRect() ?? { left: 0, top: 0 };
}

function commitDrag() {
  if (draggedId.value) {
    saveImmediate(buildPayload());
  }
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
</script>

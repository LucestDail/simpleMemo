<template>
  <div class="max-w-2xl mx-auto p-4 md:p-6">
    <h1 class="text-lg font-semibold mb-4 text-gray-100">디지털 블랙보드 · 컨트롤러</h1>
    <p v-if="error" class="text-red-400 text-sm mb-2">{{ error }}</p>
    <template v-if="loaded">
      <!-- 단일 메모 (분류 없음) -->
      <div class="mb-4">
        <label class="block text-sm text-gray-400 mb-1">메모</label>
        <textarea
          :value="content"
          class="w-full min-h-[180px] p-3 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="메모 입력..."
          @input="onContentInput($event)"
        />
      </div>

      <div class="board-colors flex items-center gap-4 flex-wrap mb-4">
        <span class="text-sm text-gray-400">보드 색상:</span>
        <label class="flex items-center gap-2 text-sm">
          배경
          <input
            type="color"
            :value="boardBg"
            class="w-9 h-9 rounded border border-gray-600 cursor-pointer bg-transparent"
            @input="onBgColor($event)"
          />
        </label>
        <label class="flex items-center gap-2 text-sm">
          글자
          <input
            type="color"
            :value="boardTextColor"
            class="w-9 h-9 rounded border border-gray-600 cursor-pointer bg-transparent"
            @input="onTextColor($event)"
          />
        </label>
      </div>

      <!-- 포스트잇: 추가·수정·삭제 -->
      <section class="mb-4">
        <h2 class="text-sm font-medium text-gray-400 mb-2">포스트잇</h2>
        <button
          type="button"
          class="mb-3 px-4 py-2 rounded bg-amber-500 text-black text-sm font-medium hover:bg-amber-400"
          @click="addPostIt()"
        >
          + 포스트잇 추가
        </button>
        <div class="space-y-2">
          <div
            v-for="p in postIts"
            :key="p.id"
            class="flex flex-wrap items-center gap-2 p-2 rounded bg-gray-800 border border-gray-700"
          >
            <input
              type="color"
              :value="p.color"
              class="w-8 h-8 rounded border border-gray-600 cursor-pointer flex-shrink-0"
              @input="onPostItColor(p.id, $event)"
            />
            <input
              type="text"
              :value="p.content"
              placeholder="내용"
              class="flex-1 min-w-[120px] px-2 py-1.5 rounded bg-gray-700 text-gray-200 text-sm"
              @input="onPostItContent(p.id, $event)"
            />
            <span class="text-xs text-gray-500">X</span>
            <input
              type="number"
              :value="p.x"
              class="w-16 px-1 py-0.5 rounded bg-gray-700 text-gray-200 text-xs"
              @input="onPostItPos(p.id, 'x', $event)"
            />
            <span class="text-xs text-gray-500">Y</span>
            <input
              type="number"
              :value="p.y"
              class="w-16 px-1 py-0.5 rounded bg-gray-700 text-gray-200 text-xs"
              @input="onPostItPos(p.id, 'y', $event)"
            />
            <button
              type="button"
              class="px-2 py-1 rounded text-red-400 hover:bg-red-900/40 text-sm font-medium"
              @click="removePostIt(p.id)"
            >
              삭제
            </button>
          </div>
        </div>
      </section>

      <div class="flex gap-2 flex-wrap">
        <button
          type="button"
          class="px-4 py-2 rounded border border-gray-700 bg-gray-800 text-gray-200 text-sm hover:bg-gray-700"
          @click="clearMemo"
        >
          메모 비우기
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          @click="refreshBoard()"
        >
          노트북 화면 새로고침
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-2">자동 저장 (100ms) · 실시간 보드 반영</p>
    </template>
    <p v-else class="text-gray-500">로딩 중…</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMemo } from '../composables/useMemo';

const MEMO_ID = 'general';

const {
  loaded,
  error,
  tabs,
  postIts,
  updateTabContent,
  updateTabColors,
  clearTab,
  addPostIt,
  updatePostIt,
  removePostIt,
  refreshBoard,
  saveImmediate,
} = useMemo();

const content = computed(() => tabs[MEMO_ID]?.content ?? '');
const boardBg = computed(() => tabs[MEMO_ID]?.bgColor ?? '#000000');
const boardTextColor = computed(() => tabs[MEMO_ID]?.textColor ?? '#ffffff');

function onContentInput(e) {
  updateTabContent(MEMO_ID, e.target.value);
}

function onBgColor(e) {
  updateTabColors(MEMO_ID, e.target.value, undefined);
}

function onTextColor(e) {
  updateTabColors(MEMO_ID, undefined, e.target.value);
}

function clearMemo() {
  clearTab(MEMO_ID);
}

function onPostItColor(id, e) {
  updatePostIt(id, { color: e.target.value });
}

function onPostItContent(id, e) {
  updatePostIt(id, { content: e.target.value });
}

function onPostItPos(id, axis, e) {
  const v = parseInt(e.target.value, 10) || 0;
  updatePostIt(id, axis === 'x' ? { x: v } : { y: v });
}
</script>

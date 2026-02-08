<template>
  <div class="max-w-2xl mx-auto p-4 md:p-6">
    <h1 class="text-lg font-semibold mb-4 text-gray-100">디지털 블랙보드 · 컨트롤러</h1>
    <p v-if="error" class="text-red-400 text-sm mb-2">{{ error }}</p>
    <template v-if="loaded">
      <div class="tabs flex gap-1 mb-4 flex-wrap">
        <button
          v-for="id in tabIds"
          :key="id"
          type="button"
          class="tab-btn px-4 py-2 rounded border text-sm"
          :class="activeTab === id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-700 bg-gray-800 text-gray-200'"
          @click="setActiveTab(id)"
        >
          {{ tabLabels[id] }}
        </button>
      </div>

      <div class="tab-panels mb-4">
        <div v-for="id in tabIds" :key="id" v-show="activeTab === id" class="tab-panel">
          <textarea
            :value="tabs[id]?.content ?? ''"
            class="w-full min-h-[160px] p-3 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            :placeholder="`${tabLabels[id]} 메모 (Markdown: - [ ] 체크박스, - 불렛)`"
            @input="onTabInput(id, $event)"
          />
        </div>
      </div>

      <div class="board-colors flex items-center gap-4 flex-wrap mb-4">
        <span class="text-sm text-gray-400">보드 색상:</span>
        <label class="flex items-center gap-2 text-sm">
          배경
          <input
            type="color"
            :value="tabs[activeTab]?.bgColor ?? '#000000'"
            class="w-9 h-9 rounded border border-gray-600 cursor-pointer bg-transparent"
            @input="onBgColor($event)"
          />
        </label>
        <label class="flex items-center gap-2 text-sm">
          글자
          <input
            type="color"
            :value="tabs[activeTab]?.textColor ?? '#ffffff'"
            class="w-9 h-9 rounded border border-gray-600 cursor-pointer bg-transparent"
            @input="onTextColor($event)"
          />
        </label>
      </div>

      <section class="postits mb-4">
        <h2 class="text-sm font-medium text-gray-400 mb-2">포스트잇</h2>
        <div class="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded bg-amber-500/80 text-black text-sm font-medium"
            @click="addPostIt()"
          >
            + 추가
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="p in postIts"
            :key="p.id"
            class="flex flex-wrap items-start gap-2 p-2 rounded bg-gray-800 border border-gray-700"
          >
            <input
              type="color"
              :value="p.color"
              class="w-8 h-8 rounded border border-gray-600 cursor-pointer flex-shrink-0"
              @input="updatePostIt(p.id, { color: $event.target.value })"
            />
            <input
              type="text"
              :value="p.content"
              placeholder="내용"
              class="flex-1 min-w-0 px-2 py-1 rounded bg-gray-700 text-gray-200 text-sm"
              @input="updatePostIt(p.id, { content: $event.target.value })"
            />
            <div class="flex items-center gap-1 text-xs text-gray-500">
              <label>X <input type="number" :value="p.x" class="w-14 px-1 py-0.5 rounded bg-gray-700 text-gray-200" @input="updatePostIt(p.id, { x: +$event.target.value || 0 })" /></label>
              <label>Y <input type="number" :value="p.y" class="w-14 px-1 py-0.5 rounded bg-gray-700 text-gray-200" @input="updatePostIt(p.id, { y: +$event.target.value || 0 })" /></label>
            </div>
            <button
              type="button"
              class="px-2 py-1 rounded text-red-400 hover:bg-red-900/30 text-sm"
              @click="removePostIt(p.id)"
            >
              삭제
            </button>
          </div>
        </div>
      </section>

      <div class="actions flex gap-2 flex-wrap">
        <button
          type="button"
          class="px-4 py-2 rounded border border-gray-700 bg-gray-800 text-gray-200 text-sm hover:bg-gray-700"
          @click="clearTab(activeTab)"
        >
          Quick Clear (현재 탭)
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          @click="refreshBoard()"
        >
          노트북 화면 새로고침
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-2">자동 저장 (500ms 디바운스) · 실시간 보드 반영</p>
    </template>
    <p v-else class="text-gray-500">로딩 중…</p>
  </div>
</template>

<script setup>
import { useMemo } from '../composables/useMemo';

const tabIds = ['general', 'todo', 'links', 'ideas'];
const tabLabels = {
  general: 'General',
  todo: 'To-Do',
  links: 'Links',
  ideas: 'Ideas',
};

const {
  loaded,
  error,
  activeTab,
  tabs,
  postIts,
  setActiveTab,
  updateTabContent,
  updateTabColors,
  clearTab,
  addPostIt,
  updatePostIt,
  removePostIt,
  refreshBoard,
} = useMemo();

function onTabInput(id, e) {
  updateTabContent(id, e.target.value);
}

function onBgColor(e) {
  updateTabColors(activeTab.value, e.target.value, undefined);
}

function onTextColor(e) {
  updateTabColors(activeTab.value, undefined, e.target.value);
}
</script>

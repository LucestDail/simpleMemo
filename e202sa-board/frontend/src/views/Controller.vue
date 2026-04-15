<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <template v-if="loaded">
      <!-- Tab Bar -->
      <div class="flex border-b border-m3-outline/20 dark:border-m3-outline-dark/20 mb-6 overflow-x-auto">
        <button
          v-for="id in TAB_IDS"
          :key="id"
          class="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-[3px] border-transparent"
          :class="activeTab === id
            ? 'tab-active'
            : 'text-m3-onsurface/50 dark:text-m3-onsurface-dark/50 hover:text-m3-onsurface dark:hover:text-m3-onsurface-dark hover:bg-m3-surfvar/50 dark:hover:bg-m3-surfvar-dark/50'"
          @click="setActiveTab(id)"
        >
          <span>{{ TAB_ICONS[id] }}</span>
          <span>{{ TAB_LABELS[id] }}</span>
        </button>
      </div>

      <!-- Active Tab Content -->
      <div class="mb-6">
        <textarea
          :value="currentContent"
          class="w-full min-h-[200px] p-4 rounded-m3 text-sm leading-relaxed resize-y bg-m3-surfvar/40 dark:bg-m3-surfvar-dark/60 border border-m3-outline/20 dark:border-m3-outline-dark/30 text-m3-onsurface dark:text-m3-onsurface-dark placeholder:text-m3-outline dark:placeholder:text-m3-outline-dark focus:outline-none focus:ring-2 focus:ring-m3-primary dark:focus:ring-m3-primary-dark transition-shadow"
          :placeholder="`${TAB_LABELS[activeTab]} 입력...`"
          @input="onContentInput($event)"
        />
      </div>

      <!-- Board Color Settings -->
      <div class="flex items-center gap-4 flex-wrap mb-6 p-4 rounded-m3 bg-m3-surfvar/30 dark:bg-m3-surfvar-dark/40">
        <span class="text-sm font-medium text-m3-onsurface/70 dark:text-m3-onsurface-dark/70">보드 표시 색상</span>
        <label class="flex items-center gap-2 text-sm">
          배경
          <input
            type="color"
            :value="boardBg"
            class="w-9 h-9 rounded-m3-sm border border-m3-outline/30 cursor-pointer bg-transparent"
            @input="onBgColor($event)"
          />
        </label>
        <label class="flex items-center gap-2 text-sm">
          글자
          <input
            type="color"
            :value="boardTextColor"
            class="w-9 h-9 rounded-m3-sm border border-m3-outline/30 cursor-pointer bg-transparent"
            @input="onTextColor($event)"
          />
        </label>
      </div>

      <!-- Post-its Section -->
      <section class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-m3-onsurface/80 dark:text-m3-onsurface-dark/80">포스트잇</h2>
          <button
            type="button"
            class="px-4 py-2 rounded-m3-sm bg-m3-primary dark:bg-m3-primary-dark text-m3-onprimary dark:text-m3-onprimary-dark text-sm font-medium hover:opacity-90 transition-opacity shadow-m3"
            @click="addPostIt()"
          >
            + 추가
          </button>
        </div>

        <div v-if="postIts.length === 0" class="text-center py-8 text-m3-outline dark:text-m3-outline-dark text-sm">
          포스트잇이 없습니다. 추가 버튼을 눌러 생성하세요.
        </div>

        <div class="space-y-2">
          <div
            v-for="p in postIts"
            :key="p.id"
            class="flex flex-wrap items-center gap-2 p-3 rounded-m3-sm border border-m3-outline/15 dark:border-m3-outline-dark/20 transition-colors"
            :style="{ backgroundColor: p.color + '30' }"
          >
            <!-- Color picker -->
            <div class="flex gap-1 flex-shrink-0">
              <button
                v-for="c in postitColors"
                :key="c"
                class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                :class="p.color === c ? 'border-m3-primary dark:border-m3-primary-dark scale-110' : 'border-transparent'"
                :style="{ backgroundColor: c }"
                @click="updatePostIt(p.id, { color: c })"
              />
            </div>

            <input
              type="text"
              :value="p.content"
              placeholder="내용을 입력하세요"
              class="flex-1 min-w-[140px] px-3 py-2 rounded-m3-sm bg-white/60 dark:bg-white/10 text-m3-onsurface dark:text-m3-onsurface-dark text-sm border border-m3-outline/10 focus:outline-none focus:ring-1 focus:ring-m3-primary dark:focus:ring-m3-primary-dark"
              @input="onPostItContent(p.id, $event)"
            />

            <div class="flex items-center gap-1 text-xs text-m3-outline dark:text-m3-outline-dark">
              <span>X</span>
              <input
                type="number"
                :value="p.x"
                class="w-14 px-1.5 py-1 rounded bg-white/40 dark:bg-white/10 text-m3-onsurface dark:text-m3-onsurface-dark text-xs"
                @input="onPostItPos(p.id, 'x', $event)"
              />
              <span>Y</span>
              <input
                type="number"
                :value="p.y"
                class="w-14 px-1.5 py-1 rounded bg-white/40 dark:bg-white/10 text-m3-onsurface dark:text-m3-onsurface-dark text-xs"
                @input="onPostItPos(p.id, 'y', $event)"
              />
            </div>

            <button
              type="button"
              class="px-3 py-1.5 rounded-m3-sm text-m3-error dark:text-m3-error-dark hover:bg-m3-error/10 dark:hover:bg-m3-error-dark/10 text-sm font-medium transition-colors"
              @click="removePostIt(p.id)"
            >
              삭제
            </button>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex gap-3 flex-wrap">
        <button
          type="button"
          class="px-4 py-2 rounded-m3-sm border border-m3-outline/30 dark:border-m3-outline-dark/30 text-sm font-medium hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark transition-colors"
          @click="clearMemo"
        >
          현재 탭 비우기
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-m3-sm bg-m3-secondary dark:bg-m3-secondary-dark text-white dark:text-m3-surface-dark text-sm font-medium hover:opacity-90 transition-opacity"
          @click="refreshBoard()"
        >
          보드 새로고침
        </button>
      </div>

      <p class="text-xs text-m3-outline dark:text-m3-outline-dark mt-4">
        자동 저장 (300ms) · 실시간 보드 반영
      </p>
    </template>

    <div v-else class="flex items-center justify-center h-40">
      <div class="text-m3-outline dark:text-m3-outline-dark text-sm">로딩 중…</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMemo, TAB_IDS, TAB_LABELS, TAB_ICONS } from '../composables/useMemo';

const postitColors = ['#FFF9C4', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2', '#E1BEE7'];

const {
  loaded,
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

const currentContent = computed(() => tabs[activeTab.value]?.content ?? '');
const boardBg = computed(() => tabs[activeTab.value]?.bgColor ?? '#000000');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#ffffff');

function onContentInput(e) {
  updateTabContent(activeTab.value, e.target.value);
}
function onBgColor(e) {
  updateTabColors(activeTab.value, e.target.value, undefined);
}
function onTextColor(e) {
  updateTabColors(activeTab.value, undefined, e.target.value);
}
function clearMemo() {
  clearTab(activeTab.value);
}
function onPostItContent(id, e) {
  updatePostIt(id, { content: e.target.value });
}
function onPostItPos(id, axis, e) {
  const v = parseInt(e.target.value, 10) || 0;
  updatePostIt(id, axis === 'x' ? { x: v } : { y: v });
}
</script>

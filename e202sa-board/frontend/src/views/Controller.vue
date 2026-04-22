<template>
  <div class="w-full max-w-xl mx-auto px-4 py-4 md:py-6">
    <template v-if="loaded">
      <!-- Tab bar -->
      <div class="flex gap-1 overflow-x-auto hide-scrollbar mb-4 -mx-1 px-1">
        <button
          v-for="id in TAB_IDS"
          :key="id"
          @click="setActiveTab(id)"
          class="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors border"
          :class="activeTab === id
            ? 'bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark border-transparent font-semibold'
            : 'text-m3-onsurfvar dark:text-m3-onsurfvar-dark border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'"
        >
          <span>{{ TAB_ICONS[id] }}</span>
          <span>{{ TAB_LABELS[id] }}</span>
          <span
            v-if="countPerTab[id]"
            class="text-[10px] font-bold px-1.5 rounded-full"
            :class="activeTab === id ? 'bg-white/50 dark:bg-black/30' : 'bg-black/10 dark:bg-white/10'"
          >{{ countPerTab[id] }}</span>
        </button>
      </div>

      <!-- Quick add -->
      <section
        class="rounded-2xl bg-m3-surfaceCont dark:bg-m3-surfaceCont-dark p-3 md:p-4 mb-4 border border-black/5 dark:border-white/5"
      >
        <textarea
          v-model="draftBody"
          rows="3"
          maxlength="500"
          :placeholder="`${TAB_LABELS[activeTab]}에 적을 내용…`"
          class="w-full bg-transparent text-[15px] leading-relaxed resize-y min-h-[70px] focus:outline-none placeholder:text-m3-outline"
          @keydown.meta.enter.prevent="submit"
          @keydown.ctrl.enter.prevent="submit"
        />

        <!-- Bottom controls -->
        <div class="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/10">
          <!-- Color dots -->
          <div class="flex gap-1 flex-wrap">
            <button
              v-for="c in POSTIT_COLORS"
              :key="c.name"
              :title="c.name"
              class="w-6 h-6 rounded-full transition-transform active:scale-90"
              :class="quickColor === c.hex
                ? 'ring-2 ring-offset-1 ring-offset-m3-surfaceCont dark:ring-offset-m3-surfaceCont-dark ring-m3-primary dark:ring-m3-primary-dark'
                : 'ring-1 ring-black/10 dark:ring-white/15'"
              :style="{ background: c.hex }"
              @click="quickColor = c.hex"
            />
          </div>

          <button
            class="ml-auto text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
            @click="advanced = !advanced"
            :title="advanced ? '고급 옵션 접기' : '고급 옵션'"
          >
            {{ advanced ? '▴ 간단히' : '⋯ 더보기' }}
          </button>

          <button
            :disabled="!canAdd"
            class="px-4 py-1.5 rounded-full bg-m3-primary dark:bg-m3-primary-dark text-white dark:text-m3-primary text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="submit"
          >추가</button>
        </div>

        <!-- Advanced (collapsed by default) -->
        <div v-if="advanced" class="mt-3 pt-3 border-t border-black/5 dark:border-white/10 space-y-2.5 animate-fade-in">
          <input
            v-model="draftTitle"
            type="text"
            placeholder="제목 (선택)"
            class="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-m3-primary/40"
          />
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark mr-1">우선순위</span>
            <button
              v-for="p in PRIORITIES"
              :key="p.id"
              @click="draftPriority = p.id"
              class="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
              :class="draftPriority === p.id
                ? 'border-m3-primary dark:border-m3-primary-dark bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark'
                : 'border-black/15 dark:border-white/15 text-m3-onsurfvar dark:text-m3-onsurfvar-dark'"
            >{{ p.label }}</button>
          </div>
        </div>

        <p class="mt-2 text-[10px] text-m3-outline dark:text-m3-outline-dark text-right">
          {{ draftBody.length }} / 500 · ⌘·Ctrl+Enter로 추가
        </p>
      </section>

      <!-- Recent -->
      <section>
        <div class="flex items-center justify-between mb-2 px-1">
          <h2 class="text-xs font-semibold text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
            {{ TAB_LABELS[activeTab] }} · {{ recentMemos.length }}개
          </h2>
          <router-link to="/board" class="text-xs text-m3-primary dark:text-m3-primary-dark hover:underline">
            보드에서 보기 →
          </router-link>
        </div>

        <div v-if="recentMemos.length === 0" class="text-center py-10 text-sm text-m3-outline dark:text-m3-outline-dark">
          아직 없음 — 위에서 작성해보세요
        </div>

        <ul class="space-y-1.5">
          <li
            v-for="p in recentMemos"
            :key="p.id"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/[.03] dark:bg-white/[.03] hover:bg-black/[.06] dark:hover:bg-white/[.06] transition-colors group"
          >
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: p.color }" />
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate">
                <span v-if="p.pinned" class="mr-1">📌</span>
                {{ previewText(p) }}
              </p>
              <p class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
                {{ relativeTime(p.updatedAt) }}
              </p>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-sm transition-opacity"
              :title="p.pinned ? '핀 해제' : '핀 고정'"
              @click="updatePostIt(p.id, { pinned: !p.pinned })"
            >📌</button>
            <button
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-sm transition-opacity"
              title="아카이브"
              @click="archivePostIt(p.id)"
            >📦</button>
            <button
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-sm transition-opacity"
              title="삭제"
              @click="removePostIt(p.id)"
            >🗑</button>
          </li>
        </ul>
      </section>
    </template>

    <div v-else class="flex items-center justify-center h-40 text-m3-outline text-sm">
      로딩 중…
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  useMemo,
  TAB_IDS, TAB_LABELS, TAB_ICONS,
  POSTIT_COLORS, PRIORITIES,
} from '../composables/useMemo';

const {
  loaded, activeTab, postIts,
  setActiveTab, addPostIt, updatePostIt, removePostIt, archivePostIt,
} = useMemo();

const draftTitle = ref('');
const draftBody = ref('');
const draftPriority = ref('none');
const quickColor = ref(POSTIT_COLORS[0].hex);
const advanced = ref(false);

const canAdd = computed(() => (draftTitle.value.trim() || draftBody.value.trim()).length > 0);

const countPerTab = computed(() => {
  const map = Object.fromEntries(TAB_IDS.map((id) => [id, 0]));
  for (const p of postIts.value) map[p.tab || 'general'] = (map[p.tab || 'general'] || 0) + 1;
  return map;
});

const recentMemos = computed(() =>
  postIts.value
    .filter((p) => (p.tab || 'general') === activeTab.value)
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    })
    .slice(0, 10)
);

function submit() {
  if (!canAdd.value) return;
  addPostIt({
    tab: activeTab.value,
    title: draftTitle.value.trim(),
    content: draftBody.value.trim(),
    color: quickColor.value,
    priority: draftPriority.value,
  });
  draftTitle.value = '';
  draftBody.value = '';
  draftPriority.value = 'none';
}

function previewText(p) {
  const t = (p.title || '').trim();
  const c = (p.content || '').trim();
  if (t && c) return t + ' — ' + c;
  return t || c || '(내용 없음)';
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
</script>

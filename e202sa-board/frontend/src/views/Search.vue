<template>
  <div class="w-full max-w-2xl mx-auto px-4 py-4 md:py-6 animate-slide-up">
    <!-- Search header (M3 top bar style) -->
    <div class="rounded-m3 overflow-hidden shadow-m3 bg-m3-primary dark:bg-m3-primary-dark mb-4">
      <div class="px-4 pt-4 pb-2 text-white dark:text-m3-primary text-sm font-bold flex items-center justify-between">
        <span>🔍 검색 & 아카이브</span>
        <span class="text-[11px] opacity-80">{{ results.length }}건</span>
      </div>
      <div class="bg-white dark:bg-m3-surfaceCont-dark px-4 py-3 flex items-center gap-2">
        <span class="text-m3-onsurfvar dark:text-m3-onsurfvar-dark">🔍</span>
        <input
          v-model="query"
          type="search"
          placeholder="메모·할 일·링크·아이디어 내에서 검색…"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-m3-outline"
          autofocus
        />
        <button
          v-if="query"
          class="text-xs text-m3-primary dark:text-m3-primary-dark font-semibold"
          @click="query = ''"
        >
          지우기
        </button>
      </div>
    </div>

    <!-- Filter chips -->
    <div class="flex gap-2 flex-wrap mb-4 overflow-x-auto hide-scrollbar -mx-1 px-1">
      <button
        v-for="f in filters"
        :key="f.id"
        @click="filter = f.id"
        class="px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-colors whitespace-nowrap"
        :class="filter === f.id
          ? 'border-m3-primary dark:border-m3-primary-dark bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark'
          : 'border-m3-outline/40 dark:border-m3-outline-dark/40 text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Results -->
    <section v-if="query.trim()" class="mb-6">
      <p class="text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark mb-2">
        검색 결과
      </p>

      <div v-if="results.length === 0" class="text-center py-10 text-sm text-m3-outline dark:text-m3-outline-dark">
        🙅‍♂️ 일치하는 항목이 없습니다
      </div>

      <ul class="space-y-2">
        <li
          v-for="r in results"
          :key="r.id + r._source"
          class="p-3 rounded-m3-sm bg-m3-surfvar/50 dark:bg-m3-surfvar-dark/40 flex gap-3 items-start hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark/70 transition-colors"
        >
          <div
            class="w-10 h-10 rounded-m3-xs flex items-center justify-center text-lg shrink-0 shadow-m3"
            :style="{ background: r.color }"
          >📝</div>

          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm truncate" v-html="highlight(r.title || '(제목 없음)', query)" />
            <p class="text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark mt-0.5 line-clamp-2"
               v-html="highlight(r.content || '', query)" />
            <div class="flex flex-wrap gap-1.5 mt-1.5 items-center">
              <span class="text-[10px] font-mono bg-m3-surfvar dark:bg-m3-surfvar-dark px-1.5 py-0.5 rounded">
                {{ TAB_ICONS[r.tab] }} {{ TAB_LABELS[r.tab] || '메모' }}
              </span>
              <span class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
                {{ relativeTime(r.updatedAt || r.archivedAt) }}
              </span>
              <span
                v-if="r._source === 'archive'"
                class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
              >아카이브</span>
            </div>
          </div>

          <div class="flex flex-col gap-1 shrink-0">
            <button
              v-if="r._source === 'archive'"
              class="text-xs font-semibold text-m3-primary dark:text-m3-primary-dark hover:underline"
              @click="restoreArchived(r.id)"
            >↩ 복원</button>
            <button
              v-else
              class="text-xs font-semibold text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:underline"
              @click="focusOnBoard(r)"
            >📍 보기</button>
            <button
              class="text-xs text-m3-error hover:underline"
              @click="r._source === 'archive' ? removeArchived(r.id) : removePostIt(r.id)"
            >삭제</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Archive section -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <p class="text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark">아카이브</p>
        <span class="text-[11px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">{{ archive.length }}개</span>
      </div>

      <div v-if="archive.length === 0" class="text-center py-6 text-sm text-m3-outline dark:text-m3-outline-dark">
        아카이브가 비어있습니다. 메모 항목을 📦 버튼으로 보관할 수 있어요.
      </div>

      <ul class="space-y-2">
        <li
          v-for="a in filteredArchive"
          :key="a.id"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-m3-sm border border-dashed border-m3-outline/50 dark:border-m3-outline-dark/40 opacity-80 hover:opacity-100 transition-opacity"
        >
          <span class="w-3 h-3 rounded-full" :style="{ background: a.color }" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ a.title || a.content || '(내용 없음)' }}</p>
            <p class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
              {{ TAB_LABELS[a.tab] || '메모' }} · {{ relativeTime(a.archivedAt) }}
            </p>
          </div>
          <button
            class="text-xs font-semibold text-m3-primary dark:text-m3-primary-dark px-2 py-1 rounded hover:bg-m3-primCont dark:hover:bg-m3-primCont-dark"
            @click="restoreArchived(a.id)"
          >↩ 복원</button>
          <button
            class="text-xs text-m3-error px-2 py-1 rounded hover:bg-m3-errorCont dark:hover:bg-m3-errorCont-dark"
            @click="removeArchived(a.id)"
          >✕</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  useMemo,
  TAB_IDS, TAB_LABELS, TAB_ICONS,
} from '../composables/useMemo';

const router = useRouter();
const {
  postIts, archive,
  searchAll, highlight,
  restoreArchived, removeArchived, removePostIt, setActiveTab,
} = useMemo();

const query = ref('');
const filter = ref('all');

const filters = [
  { id: 'all',     label: '전체' },
  ...TAB_IDS.map((id) => ({ id, label: `${TAB_ICONS[id]} ${TAB_LABELS[id]}` })),
];

const results = computed(() => searchAll(query.value, filter.value));

const filteredArchive = computed(() => {
  if (filter.value === 'all') return archive.value;
  return archive.value.filter((p) => (p.tab || 'general') === filter.value);
});

function focusOnBoard(p) {
  setActiveTab(p.tab || 'general');
  router.push('/board');
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

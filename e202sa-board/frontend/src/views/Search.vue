<template>
  <div class="w-full max-w-xl mx-auto px-4 py-4 md:py-6">
    <!-- Search field -->
    <div class="sticky top-12 md:top-12 z-10 -mx-4 px-4 pt-1 pb-3 bg-m3-surface dark:bg-m3-surface-dark">
      <div class="flex items-center gap-2 px-3 py-2.5 rounded-full bg-black/[.05] dark:bg-white/[.06] border border-black/5 dark:border-white/5">
        <span class="text-m3-onsurfvar dark:text-m3-onsurfvar-dark">🔍</span>
        <input
          v-model="query"
          type="search"
          placeholder="검색어를 입력하세요"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-m3-outline"
          autofocus
        />
        <button v-if="query" class="text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:underline" @click="query = ''">지우기</button>
      </div>

      <!-- Filter chips -->
      <div class="flex gap-1.5 mt-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
        <button
          v-for="f in filters"
          :key="f.id"
          @click="filter = f.id"
          class="px-3 py-1 rounded-full text-xs border whitespace-nowrap transition-colors"
          :class="filter === f.id
            ? 'bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark border-transparent font-semibold'
            : 'border-black/10 dark:border-white/10 text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:bg-black/5 dark:hover:bg-white/5'"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Results -->
    <section v-if="query.trim()" class="mb-6">
      <SectionHeader :label="`결과 · ${results.length}`" />

      <div v-if="results.length === 0" class="text-center py-10 text-sm text-m3-outline dark:text-m3-outline-dark">
        일치하는 항목이 없습니다
      </div>

      <ul class="space-y-1.5">
        <li
          v-for="r in results"
          :key="r.id + r._source"
          class="p-3 rounded-xl bg-black/[.03] dark:bg-white/[.03] hover:bg-black/[.06] dark:hover:bg-white/[.06] flex gap-3 items-start transition-colors"
        >
          <span class="w-2.5 h-2.5 mt-1.5 rounded-full shrink-0" :style="{ background: r.color }" />
          <div class="flex-1 min-w-0">
            <p v-if="r.title" class="text-sm font-semibold truncate" v-html="highlight(r.title, query)" />
            <p class="text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark mt-0.5 line-clamp-2" v-html="highlight(r.content || '', query)" />
            <div class="flex flex-wrap gap-1.5 mt-1.5 items-center text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
              <span>{{ TAB_ICONS[r.tab] }} {{ TAB_LABELS[r.tab] || '메모' }}</span>
              <span>·</span>
              <span>{{ relativeTime(r.updatedAt || r.archivedAt) }}</span>
              <span v-if="r._source === 'archive'" class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold">
                아카이브
              </span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <button
              v-if="r._source === 'archive'"
              class="text-[11px] font-semibold text-m3-primary dark:text-m3-primary-dark hover:underline"
              @click="restoreArchived(r.id)"
            >↩ 복원</button>
            <button
              v-else
              class="text-[11px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:underline"
              @click="focusOnBoard(r)"
            >보기 →</button>
            <button
              class="text-[11px] text-m3-error hover:underline"
              @click="r._source === 'archive' ? removeArchived(r.id) : removePostIt(r.id)"
            >삭제</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Archive -->
    <section>
      <SectionHeader :label="`아카이브 · ${archive.length}`" />

      <div v-if="archive.length === 0" class="text-center py-6 text-sm text-m3-outline dark:text-m3-outline-dark">
        아카이브된 메모 없음 · 📦 버튼으로 보관할 수 있어요
      </div>

      <ul class="space-y-1.5">
        <li
          v-for="a in filteredArchive"
          :key="a.id"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-black/15 dark:border-white/15 opacity-80 hover:opacity-100"
        >
          <span class="w-2.5 h-2.5 rounded-full" :style="{ background: a.color }" />
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate">{{ a.title || a.content || '(내용 없음)' }}</p>
            <p class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
              {{ TAB_LABELS[a.tab] || '메모' }} · {{ relativeTime(a.archivedAt) }}
            </p>
          </div>
          <button class="text-[11px] font-semibold text-m3-primary dark:text-m3-primary-dark px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5" @click="restoreArchived(a.id)">↩ 복원</button>
          <button class="text-[11px] text-m3-error px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30" @click="removeArchived(a.id)">✕</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMemo, TAB_IDS, TAB_LABELS, TAB_ICONS } from '../composables/useMemo';

const router = useRouter();
const { archive, searchAll, highlight, restoreArchived, removeArchived, removePostIt, setActiveTab } = useMemo();

const query = ref('');
const filter = ref('all');

const filters = [
  { id: 'all', label: '전체' },
  ...TAB_IDS.map((id) => ({ id, label: `${TAB_ICONS[id]} ${TAB_LABELS[id]}` })),
];

const results = computed(() => searchAll(query.value, filter.value));
const filteredArchive = computed(() =>
  filter.value === 'all' ? archive.value : archive.value.filter((p) => (p.tab || 'general') === filter.value)
);

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

const SectionHeader = {
  props: { label: String },
  setup(props) {
    return () => h('h2', {
      class: 'text-[11px] font-semibold text-m3-onsurfvar dark:text-m3-onsurfvar-dark mb-2 mt-1 px-1',
    }, props.label);
  },
};
</script>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>

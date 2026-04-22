<template>
  <div class="w-full max-w-2xl mx-auto px-4 py-4 md:py-6 animate-slide-up">
    <template v-if="loaded">
      <!-- Tab Bar -->
      <div class="flex overflow-x-auto hide-scrollbar border-b border-m3-outline/15 dark:border-m3-outline-dark/20 mb-4">
        <button
          v-for="id in TAB_IDS"
          :key="id"
          class="flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-[3px] border-transparent min-w-[84px] justify-center"
          :class="activeTab === id
            ? 'tab-active'
            : 'text-m3-onsurface/55 dark:text-m3-onsurface-dark/55 hover:text-m3-onsurface dark:hover:text-m3-onsurface-dark'"
          @click="setActiveTab(id)"
        >
          <span class="text-base">{{ TAB_ICONS[id] }}</span>
          <span class="font-medium">{{ TAB_LABELS[id] }}</span>
          <span
            v-if="countPerTab[id]"
            class="ml-0.5 text-[10px] font-bold px-1.5 rounded-full bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark"
          >
            {{ countPerTab[id] }}
          </span>
        </button>
      </div>

      <!-- Quick-add Card -->
      <section class="rounded-m3 bg-m3-surfaceCont dark:bg-m3-surfaceCont-dark shadow-m3 p-4 md:p-5 mb-4 animate-fade-in">
        <!-- Color presets -->
        <div class="mb-3">
          <p class="text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark mb-2">색상 선택</p>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="c in POSTIT_COLORS"
              :key="c.name"
              :title="c.name"
              class="w-9 h-9 rounded-full transition-transform active:scale-95"
              :class="quickColor === c.hex
                ? 'ring-[3px] ring-m3-primary dark:ring-m3-primary-dark scale-110 shadow-m3'
                : 'ring-1 ring-black/15 dark:ring-white/15'"
              :style="{ background: c.hex }"
              @click="quickColor = c.hex"
            />
          </div>
        </div>

        <!-- Title input -->
        <input
          v-model="draftTitle"
          type="text"
          placeholder="제목 (선택)"
          class="w-full px-3 py-2.5 mb-2 rounded-m3-sm bg-white dark:bg-white/5 border border-m3-outline/20 dark:border-m3-outline-dark/30 text-sm font-semibold placeholder:text-m3-outline focus:outline-none focus:ring-2 focus:ring-m3-primary/50 dark:focus:ring-m3-primary-dark/50"
        />

        <!-- Body textarea -->
        <div class="relative">
          <textarea
            v-model="draftBody"
            rows="3"
            maxlength="500"
            :placeholder="`${TAB_LABELS[activeTab]} 내용을 입력하세요…`"
            class="w-full px-3 py-2.5 rounded-m3-sm bg-white dark:bg-white/5 border-b-2 border-m3-primary/60 dark:border-m3-primary-dark/60 text-sm leading-relaxed resize-y min-h-[88px] focus:outline-none focus:border-m3-primary dark:focus:border-m3-primary-dark"
          />
          <div class="flex justify-between mt-1 text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark">
            <span>자동 저장 {{ settings.debounceMs }}ms</span>
            <span>{{ draftBody.length }} / 500</span>
          </div>
        </div>

        <!-- Priority -->
        <div class="mt-3">
          <p class="text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark mb-1.5">우선순위</p>
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-for="p in PRIORITIES"
              :key="p.id"
              @click="draftPriority = p.id"
              class="px-3 py-1.5 rounded-m3-xs text-xs font-semibold border-[1.5px] transition-colors"
              :class="draftPriority === p.id
                ? 'border-m3-primary dark:border-m3-primary-dark bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark'
                : 'border-m3-outline/40 dark:border-m3-outline-dark/40 text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:bg-m3-surfvar/50'"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Add button -->
        <button
          type="button"
          :disabled="!canAdd"
          class="w-full mt-4 py-3.5 rounded-m3-sm bg-m3-primary dark:bg-m3-primary-dark text-white dark:text-m3-primary font-bold text-sm shadow-m3 transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
          @click="submit"
        >
          + 포스트잇 추가
        </button>
      </section>

      <!-- Board display settings -->
      <details class="mb-4 rounded-m3-sm bg-m3-surfvar/40 dark:bg-m3-surfvar-dark/40 overflow-hidden">
        <summary class="px-4 py-3 cursor-pointer select-none text-sm font-semibold flex items-center justify-between">
          <span>🎨 보드 배경·글자 색상</span>
          <span class="text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark">{{ TAB_LABELS[activeTab] }}</span>
        </summary>
        <div class="px-4 pb-3 pt-1 flex items-center gap-4 flex-wrap">
          <label class="flex items-center gap-2 text-sm">
            배경
            <input
              type="color"
              :value="boardBg"
              class="w-9 h-9 rounded-m3-xs border border-m3-outline/30 cursor-pointer bg-transparent"
              @input="onBgColor($event)"
            />
          </label>
          <label class="flex items-center gap-2 text-sm">
            글자
            <input
              type="color"
              :value="boardTextColor"
              class="w-9 h-9 rounded-m3-xs border border-m3-outline/30 cursor-pointer bg-transparent"
              @input="onTextColor($event)"
            />
          </label>
          <button
            type="button"
            class="ml-auto px-3 py-1.5 rounded-m3-xs text-xs font-medium border border-m3-outline/40 dark:border-m3-outline-dark/40 hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark"
            @click="clearTab(activeTab)"
          >
            {{ TAB_LABELS[activeTab] }} 비우기
          </button>
        </div>
      </details>

      <!-- Recent memos -->
      <section class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark">최근 메모</p>
          <button
            class="text-xs text-m3-primary dark:text-m3-primary-dark hover:underline"
            @click="refreshBoard"
          >
            🔄 보드 새로고침
          </button>
        </div>

        <div v-if="recentMemos.length === 0" class="text-center py-8 text-sm text-m3-outline dark:text-m3-outline-dark">
          이 탭에는 아직 메모가 없어요. 위에서 추가해보세요.
        </div>

        <ul class="space-y-1.5">
          <li
            v-for="p in recentMemos"
            :key="p.id"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-m3-sm bg-m3-surfvar/50 dark:bg-m3-surfvar-dark/50 hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark/80 transition-colors group"
          >
            <span
              class="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/20"
              :style="{ background: p.color }"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                <span v-if="p.pinned" class="mr-1">📌</span>
                {{ p.title || p.content || '(내용 없음)' }}
              </p>
              <p class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark mt-0.5 truncate">
                {{ p.title && p.content ? p.content : '' }}
              </p>
            </div>
            <span class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark hidden sm:inline">
              {{ relativeTime(p.updatedAt) }}
            </span>
            <button
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 px-1.5 text-m3-primary hover:bg-m3-primCont dark:hover:bg-m3-primCont-dark rounded transition-all"
              title="핀 고정"
              @click="updatePostIt(p.id, { pinned: !p.pinned })"
            >
              {{ p.pinned ? '📌' : '📍' }}
            </button>
            <button
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 px-1.5 text-m3-onsurfvar hover:bg-m3-surfvar rounded transition-all"
              title="아카이브"
              @click="archivePostIt(p.id)"
            >
              📦
            </button>
            <button
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 px-1.5 text-m3-error rounded transition-all"
              title="삭제"
              @click="removePostIt(p.id)"
            >
              🗑
            </button>
          </li>
        </ul>
      </section>

      <p class="text-[10px] text-m3-outline dark:text-m3-outline-dark text-center pb-4">
        자동 저장 · 실시간 보드 반영 · {{ connected ? `${clients}기기 연결 중` : '오프라인' }}
      </p>
    </template>

    <div v-else class="flex items-center justify-center h-40">
      <div class="text-m3-outline dark:text-m3-outline-dark text-sm">로딩 중…</div>
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
  loaded, activeTab, tabs, postIts, settings, connected, clients,
  setActiveTab, updateTabColors, clearTab,
  addPostIt, updatePostIt, removePostIt, archivePostIt,
  refreshBoard,
} = useMemo();

const draftTitle = ref('');
const draftBody = ref('');
const draftPriority = ref('none');
const quickColor = ref(POSTIT_COLORS[0].hex);

const canAdd = computed(() => (draftTitle.value.trim() || draftBody.value.trim()).length > 0);

const boardBg       = computed(() => tabs[activeTab.value]?.bgColor ?? '#1D1B20');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#E6E0E9');

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
    .slice(0, 8)
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

function onBgColor(e) { updateTabColors(activeTab.value, e.target.value, undefined); }
function onTextColor(e) { updateTabColors(activeTab.value, undefined, e.target.value); }

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

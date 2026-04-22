<template>
  <div class="w-full max-w-xl mx-auto px-4 py-4 md:py-6 space-y-5">
    <!-- 표시 -->
    <setting-group title="표시">
      <setting-row label="테마">
        <template #control>
          <select
            class="bg-transparent text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-m3-primary/40"
            :value="settings.theme"
            @change="set('theme', $event.target.value)"
          >
            <option value="auto">시스템 설정</option>
            <option value="light">라이트</option>
            <option value="dark">다크</option>
          </select>
        </template>
      </setting-row>
      <setting-row label="보드 폰트 크기" :hint="`${settings.boardFontSize}px`">
        <template #control>
          <input
            type="range" min="12" max="32" step="1"
            :value="settings.boardFontSize"
            class="m3-range w-32"
            @input="set('boardFontSize', +$event.target.value)"
          />
        </template>
      </setting-row>
      <setting-row label="보드 진입 시 전체화면">
        <template #control>
          <label class="m3-toggle">
            <input type="checkbox" :checked="settings.autoFullscreen" @change="set('autoFullscreen', $event.target.checked)" />
            <span class="slider" />
          </label>
        </template>
      </setting-row>
    </setting-group>

    <!-- 동작 -->
    <setting-group title="동작">
      <setting-row label="자동 저장 지연" :hint="`${settings.debounceMs}ms`">
        <template #control>
          <input
            type="range" min="100" max="1000" step="50"
            :value="settings.debounceMs"
            class="m3-range w-32"
            @input="set('debounceMs', +$event.target.value)"
          />
        </template>
      </setting-row>
      <setting-row label="오프라인 변경 자동 동기화">
        <template #control>
          <label class="m3-toggle">
            <input type="checkbox" :checked="settings.offlineSync" @change="set('offlineSync', $event.target.checked)" />
            <span class="slider" />
          </label>
        </template>
      </setting-row>
    </setting-group>

    <!-- 데이터 -->
    <setting-group title="데이터">
      <setting-row label="자동 백업 주기">
        <template #control>
          <select
            class="bg-transparent text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-m3-primary/40"
            :value="settings.backupIntervalHours"
            @change="set('backupIntervalHours', +$event.target.value)"
          >
            <option :value="1">1시간</option>
            <option :value="6">6시간</option>
            <option :value="12">12시간</option>
            <option :value="24">24시간</option>
            <option :value="168">7일</option>
          </select>
        </template>
      </setting-row>
      <setting-row label="보관 백업 개수">
        <template #control>
          <select
            class="bg-transparent text-sm border border-black/15 dark:border-white/15 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-m3-primary/40"
            :value="settings.backupKeep"
            @change="set('backupKeep', +$event.target.value)"
          >
            <option :value="5">5개</option>
            <option :value="10">10개</option>
            <option :value="20">20개</option>
            <option :value="50">50개</option>
          </select>
        </template>
      </setting-row>
    </setting-group>

    <!-- Actions -->
    <section>
      <h2 class="text-[11px] font-semibold text-m3-onsurfvar dark:text-m3-onsurfvar-dark mb-2 px-1">데이터 관리</h2>
      <div class="grid grid-cols-3 gap-2">
        <button class="py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5" @click="exportJson">⬇ 내보내기</button>
        <button class="py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5" @click="triggerImport">⬆ 가져오기</button>
        <button class="py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5" @click="manualBackup">🗂 지금 백업</button>
      </div>
      <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="onFile" />
    </section>

    <!-- QR -->
    <section>
      <h2 class="text-[11px] font-semibold text-m3-onsurfvar dark:text-m3-onsurfvar-dark mb-2 px-1">QR 코드로 공유</h2>
      <div class="flex items-center gap-4 p-4 rounded-2xl bg-black/[.03] dark:bg-white/[.03] border border-black/5 dark:border-white/5">
        <img :src="qrSrc" alt="QR" class="w-24 h-24 rounded-lg bg-white p-1 shrink-0" />
        <div class="min-w-0">
          <p class="text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark">접속 주소</p>
          <p class="text-sm font-mono break-all">{{ serverInfo.url || location.origin }}</p>
        </div>
      </div>
    </section>

    <!-- About -->
    <section class="text-center text-[11px] text-m3-outline dark:text-m3-outline-dark pt-2 pb-4">
      SimpleMemo · Material 3 · Vue 3 · Socket.io<br />
      {{ connected ? `🟢 ${clients}기기 연결 중` : '🔴 오프라인' }}
    </section>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { useMemo } from '../composables/useMemo';

const { settings, updateSettings, exportJson, importJson, serverInfo, connected, clients } = useMemo();

const fileInput = ref(null);

function set(key, val) { updateSettings({ [key]: val }); }
function triggerImport() { fileInput.value?.click(); }

async function onFile(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const ok = await importJson(file);
  if (ok) alert('가져오기 성공');
  e.target.value = '';
}

async function manualBackup() {
  try {
    const res = await fetch('/api/backup', { method: 'POST' });
    if (res.ok) alert('백업 스냅샷 저장됨');
  } catch (err) { alert('백업 실패: ' + err.message); }
}

const qrSrc = computed(() => {
  const url = serverInfo.value.url || location.origin;
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
});

// Local components — unified "list card" look
const SettingGroup = {
  props: { title: String },
  setup(props, { slots }) {
    return () => h('section', {}, [
      h('h2', { class: 'text-[11px] font-semibold text-m3-onsurfvar dark:text-m3-onsurfvar-dark mb-2 px-1' }, props.title),
      h('div', {
        class: 'rounded-2xl bg-black/[.03] dark:bg-white/[.03] border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden',
      }, slots.default?.()),
    ]);
  },
};

const SettingRow = {
  props: { label: String, hint: String },
  setup(props, { slots }) {
    return () => h('div', {
      class: 'flex items-center justify-between gap-3 px-4 py-3',
    }, [
      h('div', { class: 'flex-1 min-w-0 text-sm' }, [
        h('div', { class: 'truncate' }, props.label),
        props.hint
          ? h('div', { class: 'text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark font-mono' }, props.hint)
          : null,
      ]),
      h('div', { class: 'shrink-0' }, slots.control?.()),
    ]);
  },
};
</script>

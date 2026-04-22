<template>
  <div class="w-full max-w-2xl mx-auto px-4 py-4 md:py-6 animate-slide-up">
    <!-- Header -->
    <div class="rounded-m3 overflow-hidden shadow-m3 bg-m3-primary dark:bg-m3-primary-dark mb-4 px-4 py-4 text-white dark:text-m3-primary">
      <p class="text-sm font-bold">⚙️ 설정</p>
      <p class="text-[11px] opacity-80 mt-0.5">동작 · 표시 · 데이터 관리</p>
    </div>

    <!-- 동작 -->
    <setting-group title="동작">
      <setting-row label="자동 저장 디바운스">
        <template #control>
          <div class="flex items-center gap-2 min-w-[160px]">
            <input
              type="range" min="100" max="1000" step="50"
              :value="settings.debounceMs"
              class="m3-range flex-1"
              @input="set('debounceMs', +$event.target.value)"
            />
            <span class="text-xs font-mono w-14 text-right">{{ settings.debounceMs }}ms</span>
          </div>
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

    <!-- 표시 -->
    <setting-group title="표시">
      <setting-row label="테마">
        <template #control>
          <select
            class="bg-transparent text-sm font-semibold text-m3-primary dark:text-m3-primary-dark border border-m3-outline/40 rounded-m3-xs px-2 py-1 focus:outline-none"
            :value="settings.theme"
            @change="set('theme', $event.target.value)"
          >
            <option value="auto">시스템 설정</option>
            <option value="light">라이트</option>
            <option value="dark">다크</option>
          </select>
        </template>
      </setting-row>
      <setting-row label="보드 폰트 크기">
        <template #control>
          <div class="flex items-center gap-2 min-w-[160px]">
            <input
              type="range" min="12" max="32" step="1"
              :value="settings.boardFontSize"
              class="m3-range flex-1"
              @input="set('boardFontSize', +$event.target.value)"
            />
            <span class="text-xs font-mono w-10 text-right">{{ settings.boardFontSize }}px</span>
          </div>
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

    <!-- 데이터 -->
    <setting-group title="데이터">
      <setting-row label="자동 백업 주기">
        <template #control>
          <select
            class="bg-transparent text-sm font-semibold text-m3-primary dark:text-m3-primary-dark border border-m3-outline/40 rounded-m3-xs px-2 py-1 focus:outline-none"
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
            class="bg-transparent text-sm font-semibold text-m3-primary dark:text-m3-primary-dark border border-m3-outline/40 rounded-m3-xs px-2 py-1 focus:outline-none"
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

    <!-- 데이터 관리 -->
    <section class="mb-5">
      <p class="text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark mb-2">데이터 관리</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="py-2.5 rounded-m3-sm border-[1.5px] border-m3-primary dark:border-m3-primary-dark text-m3-primary dark:text-m3-primary-dark text-sm font-bold hover:bg-m3-primCont dark:hover:bg-m3-primCont-dark transition-colors"
          @click="exportJson"
        >⬇ JSON 내보내기</button>
        <button
          class="py-2.5 rounded-m3-sm border-[1.5px] border-m3-primary dark:border-m3-primary-dark text-m3-primary dark:text-m3-primary-dark text-sm font-bold hover:bg-m3-primCont dark:hover:bg-m3-primCont-dark transition-colors"
          @click="triggerImport"
        >⬆ JSON 가져오기</button>
      </div>
      <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="onFile" />
      <button
        class="w-full mt-2 py-2.5 rounded-m3-sm text-xs text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark transition-colors"
        @click="manualBackup"
      >🗂 지금 백업 스냅샷 저장</button>
    </section>

    <!-- QR 접속 -->
    <section class="mb-6 p-4 rounded-m3 bg-m3-primCont dark:bg-m3-primCont-dark">
      <p class="text-sm font-bold text-m3-onPrimCont dark:text-m3-onPrimCont-dark">📱 QR 코드로 접속</p>
      <p class="text-xs text-m3-onPrimCont/80 dark:text-m3-onPrimCont-dark/80 break-all mt-1">
        {{ serverInfo.url || location.origin }}
      </p>
      <img
        :src="qrSrc"
        alt="QR Code"
        class="w-36 h-36 mx-auto mt-3 rounded-m3-xs bg-white p-1 shadow-m3"
      />
      <p class="text-[11px] text-center mt-2 text-m3-onPrimCont/70 dark:text-m3-onPrimCont-dark/70">
        스캔하여 다른 기기에서 컨트롤러에 접속하세요
      </p>
    </section>

    <!-- About -->
    <section class="text-center text-[11px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark pb-4">
      SimpleMemo · Material 3 · Vue 3 · Socket.io
      <br />
      {{ connected ? `🟢 ${clients}기기 연결 중` : '🔴 오프라인' }}
    </section>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { useMemo } from '../composables/useMemo';

const { settings, updateSettings, exportJson, importJson, serverInfo, connected, clients } = useMemo();

const fileInput = ref(null);

function set(key, val) {
  updateSettings({ [key]: val });
}

function triggerImport() {
  fileInput.value?.click();
}

async function onFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const ok = await importJson(file);
  if (ok) alert('가져오기 성공');
  e.target.value = '';
}

async function manualBackup() {
  try {
    const res = await fetch('/api/backup', { method: 'POST' });
    if (res.ok) alert('백업 스냅샷 저장됨');
  } catch (err) {
    alert('백업 실패: ' + err.message);
  }
}

const qrSrc = computed(() => {
  const url = serverInfo.value.url || location.origin;
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
});

// Local mini components
const SettingGroup = {
  props: { title: String },
  setup(props, { slots }) {
    return () => h('section', { class: 'mb-5' }, [
      h('p', { class: 'text-[11px] font-bold tracking-wider uppercase text-m3-primary dark:text-m3-primary-dark mb-2' }, props.title),
      h('div', {
        class: 'rounded-m3 bg-m3-surfvar/50 dark:bg-m3-surfvar-dark/40 overflow-hidden divide-y divide-m3-surface dark:divide-m3-surface-dark',
      }, slots.default?.()),
    ]);
  },
};

const SettingRow = {
  props: { label: String },
  setup(props, { slots }) {
    return () => h('div', {
      class: 'flex items-center justify-between gap-3 px-4 py-3',
    }, [
      h('span', { class: 'text-sm text-m3-onsurface dark:text-m3-onsurface-dark flex-1 min-w-0' }, props.label),
      h('div', { class: 'shrink-0' }, slots.control?.()),
    ]);
  },
};
</script>

<template>
  <div :class="{ dark: isDark }" class="min-h-screen flex flex-col bg-m3-surface dark:bg-m3-surface-dark">
    <!-- Connection status banner -->
    <transition name="fade">
      <div
        v-if="!connected && loaded"
        class="fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2"
        :class="reconnecting
          ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200'
          : 'bg-m3-errorCont dark:bg-m3-errorCont-dark text-m3-error dark:text-white'"
      >
        <span>{{ reconnecting ? '⏳' : '⚠️' }}</span>
        <span>{{ reconnecting ? '서버에 재연결 중…' : '서버 연결 끊김 — 자동 재연결 중' }}</span>
      </div>
    </transition>

    <!-- Error toast -->
    <transition name="fade">
      <div
        v-if="error"
        class="fixed top-14 left-1/2 -translate-x-1/2 z-[70] px-5 py-2.5 rounded-m3-sm shadow-m3-lg bg-m3-error text-white text-sm font-medium max-w-[90vw] text-center"
      >
        {{ error }}
      </div>
    </transition>

    <!-- Top App Bar (hidden on fullscreen board route) -->
    <header
      v-if="!isFullscreenRoute"
      class="sticky top-0 z-40 bg-m3-surface/90 dark:bg-m3-surface-dark/90 backdrop-blur-md border-b border-m3-outline/15 dark:border-m3-outline-dark/20 pt-safe"
      :class="{ 'mt-7': !connected && loaded }"
    >
      <div class="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 h-14">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-m3-xs bg-m3-primary dark:bg-m3-primary-dark flex items-center justify-center text-white dark:text-m3-primary text-sm font-black shrink-0">
            SM
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-bold tracking-tight truncate">SimpleMemo</h1>
            <p class="text-[10px] text-m3-onsurfvar dark:text-m3-onsurfvar-dark -mt-0.5">
              {{ routeTitle }}
            </p>
          </div>
        </div>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1">
          <router-link
            v-for="n in navs"
            :key="n.path"
            :to="n.path"
            class="px-3 py-1.5 rounded-m3-sm text-sm font-medium transition-colors flex items-center gap-1.5"
            :class="$route.path === n.path
              ? 'bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark'
              : 'text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark'"
          >
            <span>{{ n.icon }}</span>
            <span>{{ n.label }}</span>
          </router-link>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <span
            class="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
            :class="connected
              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
              : 'bg-m3-errorCont dark:bg-m3-errorCont-dark text-m3-error dark:text-white'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="connected ? 'bg-green-500' : 'bg-red-400'" />
            {{ connected ? `${clients}기기` : '오프라인' }}
          </span>
          <button
            @click="toggleDark"
            class="w-9 h-9 rounded-full hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark transition-colors text-lg"
            :title="isDark ? '라이트 모드' : '다크 모드'"
          >
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1 flex flex-col" :class="{ 'pb-20 md:pb-4': !isFullscreenRoute }">
      <router-view v-slot="{ Component }">
        <transition name="view" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Mobile bottom nav -->
    <nav
      v-if="!isFullscreenRoute"
      class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-m3-surface/95 dark:bg-m3-surface-dark/95 backdrop-blur-md border-t border-m3-outline/15 dark:border-m3-outline-dark/20 pb-safe"
    >
      <div class="grid grid-cols-4">
        <router-link
          v-for="n in navs"
          :key="n.path"
          :to="n.path"
          class="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors"
          :class="$route.path === n.path
            ? 'text-m3-primary dark:text-m3-primary-dark font-semibold'
            : 'text-m3-onsurfvar dark:text-m3-onsurfvar-dark'"
        >
          <span class="text-xl leading-none">{{ n.icon }}</span>
          <span>{{ n.label }}</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMemo } from './composables/useMemo';

const route = useRoute();
const { loaded, error, connected, reconnecting, clients, settings } = useMemo();

const navs = [
  { path: '/',         label: '홈',       icon: '🏠' },
  { path: '/board',    label: '보드',     icon: '🧱' },
  { path: '/search',   label: '검색',     icon: '🔍' },
  { path: '/settings', label: '설정',     icon: '⚙️' },
];

const isFullscreenRoute = computed(() => !!route.meta?.fullscreen);
const routeTitle = computed(() => route.meta?.title || '');

const isDark = ref(false);

function applyTheme(val) {
  if (val === 'auto') {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark.value = val === 'dark';
  }
}

function toggleDark() {
  isDark.value = !isDark.value;
  const next = isDark.value ? 'dark' : 'light';
  localStorage.setItem('theme', next);
  if (settings.theme !== next) settings.theme = next;
}

watch(
  () => settings.theme,
  (v) => {
    if (!v) return;
    localStorage.setItem('theme', v);
    applyTheme(v);
  }
);

onMounted(() => {
  const saved = localStorage.getItem('theme') || settings.theme || 'auto';
  applyTheme(saved);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if ((localStorage.getItem('theme') || 'auto') === 'auto') applyTheme('auto');
  });
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.view-enter-active, .view-leave-active { transition: opacity .15s, transform .15s; }
.view-enter-from { opacity: 0; transform: translateY(6px); }
.view-leave-to   { opacity: 0; transform: translateY(-6px); }
</style>

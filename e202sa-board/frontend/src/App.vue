<template>
  <div :class="{ dark: isDark }" class="min-h-screen flex flex-col bg-m3-surface dark:bg-m3-surface-dark">
    <!-- Connection banner (only when disconnected) -->
    <transition name="fade">
      <div
        v-if="!connected && loaded"
        class="fixed top-0 left-0 right-0 z-[60] px-4 py-1.5 text-center text-[11px] font-medium tracking-wide"
        :class="reconnecting
          ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200'
          : 'bg-m3-errorCont dark:bg-m3-errorCont-dark text-m3-error dark:text-white'"
      >
        {{ reconnecting ? '재연결 중…' : '연결 끊김 — 자동 재연결 시도 중' }}
      </div>
    </transition>

    <transition name="fade">
      <div
        v-if="error"
        class="fixed top-10 left-1/2 -translate-x-1/2 z-[70] px-5 py-2 rounded-full shadow-m3-lg bg-m3-error text-white text-xs max-w-[90vw] text-center"
      >{{ error }}</div>
    </transition>

    <!-- Top bar (compact) -->
    <header
      v-if="!isFullscreenRoute"
      class="sticky top-0 z-40 bg-m3-surface/90 dark:bg-m3-surface-dark/90 backdrop-blur-md border-b border-black/5 dark:border-white/10 pt-safe"
      :class="{ 'mt-6': !connected && loaded }"
    >
      <div class="max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 h-12">
        <router-link to="/" class="flex items-center gap-2 min-w-0" title="홈">
          <span class="w-7 h-7 rounded-lg bg-m3-primary dark:bg-m3-primary-dark flex items-center justify-center text-white dark:text-m3-primary text-[11px] font-black shrink-0">SM</span>
          <span class="text-sm font-bold tracking-tight truncate">SimpleMemo</span>
        </router-link>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-0.5">
          <router-link
            v-for="n in navs"
            :key="n.path"
            :to="n.path"
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            :class="isActive(n.path)
              ? 'bg-m3-primCont dark:bg-m3-primCont-dark text-m3-onPrimCont dark:text-m3-onPrimCont-dark'
              : 'text-m3-onsurfvar dark:text-m3-onsurfvar-dark hover:bg-black/5 dark:hover:bg-white/5'"
          >{{ n.label }}</router-link>
        </nav>

        <div class="flex items-center gap-1">
          <span
            class="w-2 h-2 rounded-full"
            :class="connected ? 'bg-emerald-500' : 'bg-red-400'"
            :title="connected ? `${clients}기기 연결` : '오프라인'"
          />
          <button
            @click="toggleDark"
            class="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-base"
            :title="isDark ? '라이트 모드' : '다크 모드'"
          >{{ isDark ? '☀️' : '🌙' }}</button>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1 flex flex-col" :class="{ 'pb-16 md:pb-4': !isFullscreenRoute }">
      <router-view v-slot="{ Component }">
        <transition name="view" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Mobile bottom nav -->
    <nav
      v-if="!isFullscreenRoute"
      class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-m3-surface/95 dark:bg-m3-surface-dark/95 backdrop-blur-md border-t border-black/5 dark:border-white/10 pb-safe"
    >
      <div class="grid grid-cols-4">
        <router-link
          v-for="n in navs"
          :key="n.path"
          :to="n.path"
          class="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors"
          :class="isActive(n.path)
            ? 'text-m3-primary dark:text-m3-primary-dark font-semibold'
            : 'text-m3-onsurfvar dark:text-m3-onsurfvar-dark'"
        >
          <span class="text-lg leading-none">{{ n.icon }}</span>
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
  { path: '/',         label: '홈',   icon: '🏠' },
  { path: '/board',    label: '보드', icon: '🧱' },
  { path: '/search',   label: '검색', icon: '🔍' },
  { path: '/settings', label: '설정', icon: '⚙️' },
];

const isActive = (path) => route.path === path;
const isFullscreenRoute = computed(() => !!route.meta?.fullscreen);

const isDark = ref(false);

function applyTheme(val) {
  if (val === 'auto') isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  else isDark.value = val === 'dark';
}

function toggleDark() {
  isDark.value = !isDark.value;
  const next = isDark.value ? 'dark' : 'light';
  localStorage.setItem('theme', next);
  if (settings.theme !== next) settings.theme = next;
}

watch(() => settings.theme, (v) => {
  if (!v) return;
  localStorage.setItem('theme', v);
  applyTheme(v);
});

onMounted(() => {
  const saved = localStorage.getItem('theme') || settings.theme || 'auto';
  applyTheme(saved);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if ((localStorage.getItem('theme') || 'auto') === 'auto') applyTheme('auto');
  });
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.view-enter-active, .view-leave-active { transition: opacity .12s, transform .12s; }
.view-enter-from { opacity: 0; transform: translateY(4px); }
.view-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>

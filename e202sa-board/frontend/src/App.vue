<template>
  <div :class="{ dark: isDark }">
    <!-- Connection status banner -->
    <div
      v-if="!connected && loaded"
      class="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors duration-300"
      :class="reconnecting
        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
        : 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200'"
    >
      {{ reconnecting ? '서버에 재연결 중...' : '서버 연결이 끊어졌습니다' }}
    </div>

    <!-- Error toast -->
    <div
      v-if="error"
      class="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-m3-sm shadow-m3-lg bg-m3-error dark:bg-m3-error-dark text-white dark:text-m3-surface-dark text-sm font-medium max-w-md text-center"
    >
      {{ error }}
    </div>

    <!-- Top App Bar -->
    <header class="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-m3-surface/80 dark:bg-m3-surface-dark/80 backdrop-blur-md border-b border-m3-outline/20 dark:border-m3-outline-dark/20">
      <div class="flex items-center gap-3">
        <h1 class="text-base font-semibold tracking-tight">e202sa-board</h1>
        <span
          class="inline-block w-2 h-2 rounded-full"
          :class="connected ? 'bg-green-500' : 'bg-red-400'"
          :title="connected ? '연결됨' : '연결 끊김'"
        />
      </div>
      <div class="flex items-center gap-2">
        <router-link
          to="/"
          class="px-3 py-1.5 rounded-m3-sm text-sm font-medium transition-colors"
          :class="$route.path === '/' ? 'bg-m3-primary/10 dark:bg-m3-primary-dark/20 text-m3-primary dark:text-m3-primary-dark' : 'text-m3-onsurface/60 dark:text-m3-onsurface-dark/60 hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark'"
        >
          컨트롤러
        </router-link>
        <router-link
          to="/board"
          class="px-3 py-1.5 rounded-m3-sm text-sm font-medium transition-colors"
          :class="$route.path === '/board' ? 'bg-m3-primary/10 dark:bg-m3-primary-dark/20 text-m3-primary dark:text-m3-primary-dark' : 'text-m3-onsurface/60 dark:text-m3-onsurface-dark/60 hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark'"
        >
          보드
        </router-link>
        <button
          @click="toggleDark"
          class="p-2 rounded-full hover:bg-m3-surfvar dark:hover:bg-m3-surfvar-dark transition-colors"
          :title="isDark ? '라이트 모드' : '다크 모드'"
        >
          {{ isDark ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <main :class="{ 'pt-8': !connected && loaded }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMemo } from './composables/useMemo';

const { loaded, error, connected, reconnecting } = useMemo();

const isDark = ref(false);

function toggleDark() {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}

onMounted(() => {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true;
  }
});
</script>

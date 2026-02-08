<template>
  <div
    class="board-wrap fixed inset-0 overflow-hidden flex items-center justify-center p-6 md:p-8 transition-colors"
    :style="{ backgroundColor: boardBg }"
  >
    <!-- 탭 메모 (큰 텍스트) -->
    <div
      v-if="tabContentTrimmed"
      class="board-text w-full max-w-full text-center break-words whitespace-pre-wrap transition-all"
      :style="{ color: boardTextColor, fontSize: boardFontSize + 'px' }"
      v-html="tabContentHtml"
    />

    <span
      v-else-if="postIts.length === 0"
      class="opacity-50 italic"
      :style="{ color: boardTextColor, fontSize: '32px' }"
    >
      메모가 비어 있습니다
    </span>

    <!-- 포스트잇들 (위치 고정, 실시간 반영) -->
    <div
      v-for="p in postIts"
      :key="p.id"
      class="postit absolute rounded-lg p-3 shadow-lg overflow-auto z-10"
      :style="{
        left: (p.x ?? 0) + 'px',
        top: (p.y ?? 0) + 'px',
        width: (p.width ?? 220) + 'px',
        minHeight: (p.height ?? 120) + 'px',
        backgroundColor: p.color || '#fff3cd',
        color: '#1a1a1a',
      }"
    >
      <div class="text-sm whitespace-pre-wrap break-words">{{ p.content || '내용 없음' }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMemo } from '../composables/useMemo';

const { loaded, activeTab, tabs, postIts } = useMemo();

const boardBg = computed(() => tabs[activeTab.value]?.bgColor ?? '#000000');
const boardTextColor = computed(() => tabs[activeTab.value]?.textColor ?? '#ffffff');
const tabContent = computed(() => tabs[activeTab.value]?.content ?? '');
const tabContentTrimmed = computed(() => tabContent.value.trim());

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function simpleMarkdownToHtml(text) {
  if (!text || !text.trim()) return '';
  const lines = text.split('\n');
  const out = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const checkbox = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    const bullet = trimmed.match(/^-\s+(.*)$/);
    if (checkbox) {
      if (!inList) {
        out.push('<ul class="list-none pl-0 my-2 text-left inline-block">');
        inList = true;
      }
      const checked = checkbox[1].toLowerCase() === 'x';
      const label = escapeHtml(checkbox[2]);
      out.push(
        `<li class="flex items-center justify-center gap-2 my-1"><input type="checkbox" ${checked ? 'checked' : ''} disabled class="w-5 h-5 flex-shrink-0"> <span class="${checked ? 'line-through opacity-80' : ''}">${label}</span></li>`
      );
    } else if (bullet) {
      if (!inList) {
        out.push('<ul class="list-none pl-0 my-2 text-left inline-block">');
        inList = true;
      }
      out.push('<li class="my-1">' + escapeHtml(bullet[1]) + '</li>');
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (trimmed) out.push('<p class="my-1">' + escapeHtml(trimmed) + '</p>');
      else out.push('<br>');
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

const tabContentHtml = computed(() => simpleMarkdownToHtml(tabContent.value));

const MIN_FONT_PX = 24;
const MAX_FONT_PX = 180;
const BASE_LENGTH = 80;

const boardFontSize = computed(() => {
  const len = tabContentTrimmed.value.length;
  if (len <= 0) return MAX_FONT_PX;
  const scale = Math.max(0.3, Math.min(1, BASE_LENGTH / Math.max(1, len)));
  return Math.round(MIN_FONT_PX + (MAX_FONT_PX - MIN_FONT_PX) * scale);
});
</script>

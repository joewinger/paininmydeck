<template>
  <p
    id="infoBar"
    class="pimd-status-strip"
    :class="`info-bar--${resolvedKind}`"
    :data-status="resolvedKind"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span class="info-bar__icon" aria-hidden="true">{{ icon }}</span>
    <span class="info-bar__message">{{ text }}</span>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type InfoBarKind =
  | 'info'
  | 'connecting'
  | 'reconnecting'
  | 'waiting'
  | 'role'
  | 'action'
  | 'success';

const props = defineProps<{ text: string; kind?: InfoBarKind }>();

const statusIcons: Record<InfoBarKind, string> = {
  info: 'i',
  connecting: '…',
  reconnecting: '↻',
  waiting: '◷',
  role: '★',
  action: '→',
  success: '✓',
};

const resolvedKind = computed<InfoBarKind>(() => props.kind ?? inferKind(props.text));
const icon = computed(() => statusIcons[resolvedKind.value]);

function inferKind(text: string): InfoBarKind {
  if (/^reconnecting\b/i.test(text)) return 'reconnecting';
  if (/^connecting\b/i.test(text)) return 'connecting';
  if (/\b(wins the round|winner is in)\b/i.test(text)) return 'success';
  if (/^select\b/i.test(text)) return 'action';
  if (/^you are\b/i.test(text)) return 'role';
  if (/^waiting\b/i.test(text)) return 'waiting';
  return 'info';
}
</script>

<style scoped>
#infoBar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 42px;
  font-size: 12px;
}

#infoBar.info-bar--connecting,
#infoBar.info-bar--reconnecting,
#infoBar.info-bar--role {
  background: var(--pimd-meta);
}

#infoBar.info-bar--action,
#infoBar.info-bar--success {
  background: var(--pimd-primary);
}

.info-bar__icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 2px solid var(--pimd-ink);
  border-radius: 50%;
  background: var(--pimd-paper);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 13px;
  line-height: 1;
}

.info-bar__message {
  min-width: 0;
}

@media (forced-colors: active) {
  #infoBar,
  #infoBar.info-bar--connecting,
  #infoBar.info-bar--reconnecting,
  #infoBar.info-bar--role,
  #infoBar.info-bar--action,
  #infoBar.info-bar--success,
  .info-bar__icon {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }
}
</style>

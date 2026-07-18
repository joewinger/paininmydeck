<template>
  <div
    class="action-timer"
    :class="{ 'action-timer--urgent': secondsRemaining <= 5 }"
    role="timer"
    :aria-label="`${actionLabel} timer: ${secondsRemaining} seconds remaining`"
  >
    <ion-icon name="timer-outline" aria-hidden="true" />
    <span>{{ actionLabel }}</span>
    <strong>{{ secondsRemaining }}s</strong>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const browserNow = ref(Date.now());
let intervalId: number | null = null;

const actionLabel = computed(() => (game.phase === 'JUDGING' ? 'Judge' : 'Play'));
const secondsRemaining = computed(() => {
  const deadline = game.turn.actionDeadline;
  if (deadline === null) return 0;
  const estimatedServerNow = browserNow.value + game.serverTimeOffsetMs;
  return Math.max(0, Math.ceil((deadline - estimatedServerNow) / 1_000));
});

onMounted(() => {
  intervalId = window.setInterval(() => {
    browserNow.value = Date.now();
  }, 250);
});

onBeforeUnmount(() => {
  if (intervalId !== null) window.clearInterval(intervalId);
});
</script>

<style scoped>
.action-timer {
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, auto);
  grid-template-rows: 22px auto;
  place-content: center;
  column-gap: 5px;
  width: 100%;
  min-width: 0;
  min-height: 57px;
  padding: 4px 6px 3px;
  border-right: 2px dotted rgb(45 37 64 / 32%);
  background: rgb(87 205 189 / 20%);
  color: var(--pimd-ink);
  line-height: 1;
}

.action-timer::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: var(--pimd-primary-dark);
}

.action-timer ion-icon {
  grid-row: 1;
  align-self: center;
  width: 20px;
  height: 20px;
  font-size: 20px;
}

.action-timer span {
  grid-row: 2;
  grid-column: 1 / -1;
  overflow: hidden;
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  text-align: center;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.action-timer strong {
  align-self: center;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 17px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.action-timer--urgent {
  background: rgb(238 121 110 / 28%);
}

.action-timer--urgent::before {
  background: var(--pimd-danger);
}

@media (forced-colors: active) {
  .action-timer {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }
}
</style>

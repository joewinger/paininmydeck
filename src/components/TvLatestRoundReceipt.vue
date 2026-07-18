<template>
  <article class="tv-latest-round" :aria-label="`Last round: round ${round.round}`">
    <span class="tv-latest-round__label">
      Last round · {{ round.winningPlayerDisplayName }}
    </span>
    <strong>{{ blankify(round.question) }}</strong>
    <p>{{ round.winningAnswer }}</p>
  </article>
</template>

<script setup lang="ts">
import type { RoundHistoryEntry } from '@/shared/protocol';
import { blankify } from '@/shared/protocol';

defineProps<{ round: RoundHistoryEntry }>();
</script>

<style scoped>
.tv-latest-round {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(150px, 0.7fr);
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 9px 13px;
  transform: rotate(0.15deg);
  border: 3px dashed var(--pimd-ink);
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.tv-latest-round__label {
  padding: 6px 8px 5px;
  background: var(--pimd-primary);
  color: var(--pimd-paper);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(7px, 0.7vw, 10px);
  line-height: 1;
  text-transform: uppercase;
}

.tv-latest-round > strong,
.tv-latest-round > p {
  overflow: hidden;
  margin: 0;
  font-size: clamp(11px, 0.9vw, 14px);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tv-latest-round > p {
  padding-left: 13px;
  border-left: 2px solid var(--pimd-ink);
  font-weight: 800;
}

@media (max-width: 759px) {
  .tv-latest-round {
    grid-template-columns: minmax(0, 1fr);
  }

  .tv-latest-round > p {
    padding: 7px 0 0;
    border-top: 2px solid var(--pimd-ink);
    border-left: 0;
  }
}

@media (forced-colors: active) {
  .tv-latest-round {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }
}
</style>

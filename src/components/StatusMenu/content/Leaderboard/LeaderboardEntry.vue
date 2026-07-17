<template>
  <li
    class="leaderboardEntry"
    :class="{
      'leaderboardEntry--czar': isCzar,
      'leaderboardEntry--played': playedCard,
      'leaderboardEntry--self': isSelf,
    }"
  >
    <div class="leaderboardEntry-rank" :aria-label="`Rank ${rank}`">
      {{ rank }}
    </div>
    <div class="leaderboardEntry-username">
      <strong>{{ userObj.displayName }}</strong>
      <span v-if="isSelf">You</span>
    </div>
    <div class="leaderboardEntry-status">{{ status }}</div>
    <div class="leaderboardEntry-points" :aria-label="`${userObj.points} points`">
      <strong>{{ userObj.points }}</strong>
      <span>pts</span>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const statusMessages = {
  czar: 'Card czar',
  waiting: 'Choosing a card...',
  played: 'Played a card',
};
const props = defineProps<{ rank: number; userObj: PlayerSummary; playedCard: boolean }>();
const game = useGameStore();
const isCzar = computed(() => game.turn.czarPlayerId === props.userObj.playerId);
const isSelf = computed(() => game.self?.playerId === props.userObj.playerId);
const status = computed(() => {
  if (isCzar.value) return statusMessages.czar;
  return props.playedCard ? statusMessages.played : statusMessages.waiting;
});
</script>

<style scoped>
.leaderboardEntry {
  position: relative;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 2px 10px;
  align-items: center;
  min-height: 72px;
  padding: 9px 11px 9px 8px;
  transform: rotate(0.15deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-meta);
  color: var(--pimd-ink);
  user-select: none;
}

.leaderboardEntry:nth-child(even) {
  transform: rotate(-0.25deg);
  box-shadow: 4px 5px 0 var(--pimd-primary);
}

.leaderboardEntry--self {
  background: var(--pimd-highlight);
}

.leaderboardEntry--czar::before,
.leaderboardEntry--played::before {
  content: '';
  position: absolute;
  top: -3px;
  right: 18px;
  width: 38px;
  height: 11px;
  transform: rotate(3deg);
  background: rgb(87 205 189 / 82%);
  clip-path: polygon(3% 10%, 100% 0, 94% 100%, 0 88%);
}

.leaderboardEntry--played::before {
  background: rgb(255 214 74 / 88%);
}

.leaderboardEntry-rank {
  display: grid;
  grid-column: 1;
  grid-row: 1 / span 2;
  place-content: center;
  width: 42px;
  height: 42px;
  transform: rotate(-4deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-primary);
  color: var(--pimd-on-primary);
  font-family: 'Bungee', sans-serif;
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1;
}

.leaderboardEntry:nth-child(2n) .leaderboardEntry-rank {
  transform: rotate(3deg);
  background: var(--pimd-meta);
  color: var(--pimd-ink);
}

.leaderboardEntry-username {
  display: flex;
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.leaderboardEntry-username strong {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaderboardEntry-username span {
  flex: none;
  padding: 3px 5px 2px;
  background: var(--pimd-primary-dark);
  color: var(--pimd-paper);
  font-family: 'Bungee', sans-serif;
  font-size: 0.48rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.leaderboardEntry-status {
  grid-column: 2;
  grid-row: 2;
  color: var(--pimd-ink-soft);
  font-size: 0.69rem;
  font-style: italic;
  font-weight: 750;
}

.leaderboardEntry-points {
  display: grid;
  grid-column: 3;
  grid-row: 1 / span 2;
  justify-items: end;
  min-width: 40px;
}

.leaderboardEntry-points strong {
  font-family: 'Bungee', sans-serif;
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1;
}

.leaderboardEntry-points span {
  margin-top: 2px;
  font-size: 0.58rem;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

@media (forced-colors: active) {
  .leaderboardEntry,
  .leaderboardEntry-rank {
    border: 3px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
}
</style>

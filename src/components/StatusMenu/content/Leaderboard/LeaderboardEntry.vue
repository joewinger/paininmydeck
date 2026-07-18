<template>
  <li
    class="leaderboardEntry"
    :class="{
      'leaderboardEntry--czar': isCzar,
      'leaderboardEntry--played': playedCard,
      'leaderboardEntry--self': isSelf,
      'leaderboardEntry--kickable': isKickable,
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
    <button
      v-if="isKickable"
      type="button"
      class="leaderboardEntry-remove"
      :aria-label="`Remove ${userObj.displayName} from the game`"
      :disabled="kickPending"
      @click="kickPlayer"
    >
      {{ kickPending ? 'Removing…' : 'Remove' }}
    </button>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const statusMessages = {
  czar: 'Card czar',
  waiting: 'Choosing a card...',
  played: 'Played a card',
};
const props = defineProps<{ rank: number; userObj: PlayerSummary; playedCard: boolean }>();
const game = useGameStore();
const kickPending = ref(false);
const isCzar = computed(() => game.turn.czarPlayerId === props.userObj.playerId);
const isSelf = computed(() => game.self?.playerId === props.userObj.playerId);
const isKickable = computed(
  () => game.isPrivileged && game.gameState === 'PLAYING' && !isSelf.value,
);
const status = computed(() => {
  if (isCzar.value) return statusMessages.czar;
  return props.playedCard ? statusMessages.played : statusMessages.waiting;
});

async function kickPlayer() {
  if (!isKickable.value || kickPending.value) return;
  const consequence =
    game.users.length <= 3
      ? 'This will end the game because fewer than three players will remain.'
      : 'The current round will restart so every remaining player sees the same cards.';
  if (!window.confirm(`Remove ${props.userObj.displayName} from the game? ${consequence}`)) return;

  kickPending.value = true;
  try {
    await game.kickPlayer(props.userObj.playerId);
  } catch {
    // The game store already presents the server error to the host.
  } finally {
    kickPending.value = false;
  }
}
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
  box-shadow: 4px 5px 0 var(--pimd-paper-shadow);
  color: var(--pimd-ink);
  user-select: none;
}

.leaderboardEntry:first-child {
  box-shadow: 4px 5px 0 var(--pimd-primary);
}

.leaderboardEntry:nth-child(even) {
  transform: rotate(-0.25deg);
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
  background: var(--pimd-ink);
  color: var(--pimd-paper);
  font-family: 'Bungee', sans-serif;
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1;
}

.leaderboardEntry:first-child .leaderboardEntry-rank {
  background: var(--pimd-primary);
  color: var(--pimd-on-primary);
}

.leaderboardEntry:nth-child(2n) .leaderboardEntry-rank {
  transform: rotate(3deg);
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

.leaderboardEntry--kickable .leaderboardEntry-points {
  grid-row: 1;
}

.leaderboardEntry-remove {
  grid-column: 3;
  grid-row: 2;
  min-width: 66px;
  min-height: 44px;
  padding: 5px 7px 4px;
  border: 2px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper);
  box-shadow: 2px 2px 0 var(--pimd-primary);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.5rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.leaderboardEntry-remove:hover:not(:disabled) {
  background: var(--pimd-highlight);
}

.leaderboardEntry-remove:active:not(:disabled) {
  box-shadow: none;
  transform: translate(2px, 2px);
}

.leaderboardEntry-remove:focus-visible {
  outline: 3px solid var(--pimd-ink);
  outline-offset: 3px;
  box-shadow: 0 0 0 6px var(--pimd-highlight);
}

.leaderboardEntry-remove:disabled {
  opacity: 0.62;
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
  .leaderboardEntry-rank,
  .leaderboardEntry-remove {
    border: 3px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
}
</style>

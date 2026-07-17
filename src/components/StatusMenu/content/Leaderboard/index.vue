<template>
  <section
    id="statusMenuContent-leaderboard"
    class="statusMenuContent"
    aria-labelledby="leaderboard-title"
  >
    <h1 id="leaderboard-title">Leaderboard</h1>
    <p class="leaderboard-kicker">Live scores from the room</p>
    <ol id="leaderboardEntries">
      <leaderboard-entry
        v-for="user in game.sortedUsers"
        :key="user.playerId"
        :user-obj="user"
        :rank="calculateRank(user)"
        :played-card="game.playedPlayerIds.includes(user.playerId)"
      />
    </ol>
  </section>
</template>

<script setup lang="ts">
import LeaderboardEntry from './LeaderboardEntry.vue';
import type { PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const game = useGameStore();

function calculateRank(user: PlayerSummary): number {
  const possiblePointValues = [...new Set(game.sortedUsers.map((player) => player.points))].sort(
    (a, b) => b - a,
  );
  return possiblePointValues.indexOf(user.points) + 1;
}
</script>

<style scoped>
#statusMenuContent-leaderboard {
  text-align: left;
}

.leaderboard-kicker {
  margin: -7px 0 16px;
  color: var(--pimd-ink-soft);
  font-size: 0.75rem;
  font-weight: 850;
  letter-spacing: 0.035em;
  text-align: center;
  text-transform: uppercase;
}

#leaderboardEntries {
  display: grid;
  gap: 12px;
  padding: 0 5px 8px 1px;
  margin: 0;
  list-style: none;
}
</style>

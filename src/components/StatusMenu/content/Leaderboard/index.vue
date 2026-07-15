<template>
	<div id="statusMenuContent-leaderboard" class="statusMenuContent">
		<h1>Leaderboard</h1>
		<div id="leaderboardEntries">
			<leaderboard-entry
				v-for="user in game.sortedUsers"
				:key="user.playerId"
				:user-obj=user
				:rank='calculateRank(user)'
				:played-card="game.playedPlayerIds.includes(user.playerId)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import LeaderboardEntry from './LeaderboardEntry.vue';
import type { PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
function calculateRank(user: PlayerSummary): number {
	const possiblePointValues = [...new Set(game.sortedUsers.map((player) => player.points))].sort((a, b) => b - a);
	return possiblePointValues.indexOf(user.points) + 1;
}
</script>

<style scoped>
#statusMenuContent-leaderboard {
	text-align: center;
}
#leaderboardEntries {
	display: grid;
	gap: 5px;
}
</style>

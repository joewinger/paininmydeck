<template>
	<div id="statusMenuContent-leaderboard" class="statusMenuContent">
		<h1>Leaderboard</h1>
		<div id="leaderboardEntries">
			<leaderboard-entry
				v-for="user in $store.getters['room/sortedUsers']"
				:key="user.username"
				:user-obj=user
				:rank='calculateRank(user)'
				:played-card="$store.getters['room/getUsernamesPlayedCard'].includes(user.username)"
			/>
		</div>
	</div>
</template>

<script>
import LeaderboardEntry from './LeaderboardEntry';

export default {
	name: 'StatusMenuContentLeaderboard',
	components: {
		LeaderboardEntry
	},
	methods: {
		calculateRank(user) {
			let possiblePointValues = [...new Set(this.$store.getters['room/sortedUsers'].map(user => user.points))];
			possiblePointValues.sort((a, b) => b - a);

			return possiblePointValues.indexOf(user.points)+1;
		}
	}
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
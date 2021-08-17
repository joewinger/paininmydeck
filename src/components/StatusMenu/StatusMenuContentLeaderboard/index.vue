<template>
	<div id="statusMenuContent-leaderboard" class="statusMenuContent">
		<h1>Leaderboard</h1>
		<div id="leaderboardEntries">
			<leaderboard-entry
				v-for="(user, index) in $store.getters['room/sortedUsers']"
				:key="user.username"
				:user-obj=user
				:rank='index + 1'
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
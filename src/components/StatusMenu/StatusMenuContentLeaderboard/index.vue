<template>
	<div id="statusMenuContent-leaderboard" class="statusMenuContent">
		<h1>Leaderboard</h1>
		<table>
			<tr v-for="(user, index) in $store.getters['room/sortedUsers']" :key="user.username">
				<td>{{ index + 1 }}. {{ user.username }}</td>
				<td>{{ user.points }}</td>
			</tr>
		</table>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentLeaderboard'
}
</script>

<style scoped>
#statusMenuContent-points {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
table {
	width: 60%
}
</style>
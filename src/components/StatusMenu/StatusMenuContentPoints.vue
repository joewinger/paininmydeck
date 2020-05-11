<template>
	<div id="statusMenuContent-points" class="statusMenuContent">
		<h1>Leaderboard</h1>
		<table>
			<tr v-for="(user, index) in $store.getters['room/sortedUsers']" :key="user.username">
				<td>{{ index + 1 }}. {{ user.username }}</td>
				<td>{{ user.points }}</td>
			</tr>
		</table>
		<br> <!-- Adding padding or margin to .statusMenuContent messes with the open/close animation. -->
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentPoints'
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
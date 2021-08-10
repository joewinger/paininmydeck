<template>
	<div id="statusMenuContent-info" class="statusMenuContent">
		<h1>Information</h1>
		<table>
			<tr>
				<td>Room ID</td>
				<td>{{ $store.state.room.roomId }}</td>
			</tr>
			<tr v-if="$store.state.room.gameState === 'PLAYING'">
				<td>Czar</td>
				<td>{{ $store.state.room.turn.czar }}</td>
			</tr>
		</table>
		<br>
		<button @click="$router.replace('/')">Leave Room</button>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentInfo'
}
</script>

<style>
#statusMenuContent-info {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}
</style>
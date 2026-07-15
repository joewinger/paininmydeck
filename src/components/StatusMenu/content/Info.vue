<template>
	<div id="statusMenuContent-info" class="statusMenuContent">
		<h1>Information</h1>
		<table>
			<tr>
				<td>Room ID</td>
				<td>{{ game.roomId }}</td>
			</tr>
			<tr>
				<td>Version</td>
				<td>{{ commitHash }}</td>
			</tr>
			<tr v-if="game.gameState === 'PLAYING'">
				<td>Czar</td>
				<td>{{ game.czar?.displayName }}</td>
			</tr>
			<tr v-if="game.gameState === 'PLAYING'">
				<td>Round</td>
				<td>{{ game.turn.round }}</td>
			</tr>
		</table>
		<br>
		<button @click="router.replace('/')">Leave Room</button>
	</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { commitHash } from '@/config';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const game = useGameStore();
</script>

<style>
#statusMenuContent-info {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}
</style>

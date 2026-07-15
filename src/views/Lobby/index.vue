<template>
	<div id="lobby">
		<set-username-modal v-if="game.needsProfile || game.username === ''" />
		
		<h3>Players</h3>
		<info-bar :text="connectionInfo" v-if="connectionInfo" />
		<ul>
			<li v-for="user in game.users" :key="user.playerId">
				<lobby-user :user="user" />
			</li>
		</ul>
		
		<div v-if="game.username !== ''">
			<button-loadable @click="startGame" v-if="game.isPrivileged">Start Game</button-loadable>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SetUsernameModal from './Lobby_SetUsernameModal.vue';
import LobbyUser from './Lobby_User.vue';
import ButtonLoadable from '@/components/ButtonLoadable.vue';
import InfoBar from '@/components/InfoBar.vue';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const starting = ref(false);
const connectionInfo = computed(() => {
	if (game.connectionState === 'connecting') return 'Connecting to the room...';
	if (game.connectionState === 'reconnecting') return 'Reconnecting to the room...';
	const disconnected = game.users.filter((player) => !player.connected).map((player) => player.displayName);
	if (disconnected.length === 1) return `Waiting for ${disconnected[0]} to reconnect...`;
	if (disconnected.length > 1) return `Waiting for ${disconnected.join(', ')} to reconnect...`;
	return '';
});

async function startGame(done: () => void) {
	if (starting.value) return;
	starting.value = true;
	try {
		await game.startGame();
	} catch {
		// The store reports command failures in the existing toast.
	} finally {
		starting.value = false;
		done();
	}
}
</script>

<style>
#lobby {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	gap: 10px;
	
	width: 100%;
	height: 100%;
	padding-top: var(--content-gutter-top);

  color: inherit;
}

#lobby h3 {
	margin: 0;
}
#lobby ul {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 0;
}
</style>

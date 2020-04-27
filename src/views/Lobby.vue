<template>
	<div id="lobby">
		<SetUsernameModal v-if="this.$store.state.user.username == ''"></SetUsernameModal>

		<h2>Room ID: {{ this.$store.state.room.roomId }}</h2>

		<ul>
			Users:
			<li v-for="user in this.$store.state.room.users" :key="user.username" :style="'color: ' + user.color">{{user.username}}{{user.ready ? ' 👍' : ''}}</li>
		</ul>
		
		<div v-if="this.$store.state.user.username != ''">
			<button @click="toggleReady"><span v-if="this.$store.state.user.isReady">Not Ready</span><span v-else>Ready!</span></button>
			<br/>
			<button @click.once="startGame" v-if="this.$store.state.user.isPrivileged">Start Game</button>
		</div>
	</div>
</template>

<script>
import dbManager from '../dbManager';
import SetUsernameModal from '@/components/LobbySetUsernameModal.vue';

export default {
	name: 'Lobby',
	data () {
		return {
			canStartGame: true
		}
	},
	components: {
		SetUsernameModal
	},
	methods: {
		toggleReady() {
			dbManager.toggleReady()
		},
		startGame() {
			// if(this.$store.state.room.users.length < 3) {
			//   console.log("Not enough users to start game!");
			//   return;
			// }
			console.log("Starting the game!")
			dbManager.startGame();
		}
	}
}
</script>
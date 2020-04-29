<template>
	<div id="lobby">
		<SetUsernameModal v-if="this.$store.state.user.username == ''"></SetUsernameModal>
		
		<ul :class="{blur: this.$store.state.user.username == ''}">
			Users:
			<li v-for="user in this.$store.state.room.users" :key="user.username">
				<LobbyUser :user="user"></LobbyUser>
			</li>
		</ul>
		
		<div v-if="this.$store.state.user.username != ''">
			<button @click="toggleReady"><span v-if="this.$store.state.user.isReady">Not Ready</span><span v-else>Ready!</span></button>
			<br/>
			<button @click.once="startGame" v-if="this.$store.state.user.isPrivileged">Start Game</button>
		</div>
		<StatusMenu></StatusMenu>
	</div>
</template>

<script>
import dbManager from '@/dbManager';
import SetUsernameModal from './LobbySetUsernameModal';
import LobbyUser from './LobbyUser';
import StatusMenu from '@/components/StatusMenu'

export default {
	name: 'Lobby',
	data () {
		return {
			canStartGame: true
		}
	},
	components: {
		SetUsernameModal,
		LobbyUser,
		StatusMenu
	},
	methods: {
		toggleReady() {
			dbManager.toggleReady();
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

<style scoped>
.blur {
	filter: blur(1px);
}
</style>
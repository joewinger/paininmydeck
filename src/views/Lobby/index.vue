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
			<button-loadable @click.once="startGame" v-if="this.$store.state.user.isPrivileged">Start Game</button-loadable>
		</div>
	</div>
</template>

<script>
import dbManager from '@/dbManager';
import SetUsernameModal from './LobbySetUsernameModal';
import LobbyUser from './LobbyUser';
import ButtonLoadable from '@/components/ButtonLoadable.vue';

export default {
	name: 'Lobby',
	components: {
		SetUsernameModal,
		LobbyUser,
		ButtonLoadable
	},
	methods: {
		async startGame(btnCallback) {
			// if(this.$store.state.room.users.length < 3) {
			//   console.log("Not enough users to start game!");
			//   return;
			// }
			console.log("Starting the game!")
			await dbManager.startGame();
			btnCallback();
		}
	}
}
</script>

<style scoped>
.blur {
	filter: blur(1px);
}
</style>
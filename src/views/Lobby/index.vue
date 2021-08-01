<template>
	<div id="lobby">
		<SetUsernameModal v-if="this.$store.state.user.username == ''"></SetUsernameModal>
		
		<h3>Players</h3>
		<ul :class="{blur: this.$store.state.user.username == ''}">
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

<style>
#lobby {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	gap: 10px;

	padding-top: var(--content-gutter-top);
  color: inherit;
}
#lobby .blur {
	filter: blur(1px);
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
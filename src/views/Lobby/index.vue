<template>
	<div id="lobby">
		<set-username-modal v-if="username == ''" />
		
		<h3>Players</h3>
		<ul>
			<li v-for="user in allUsers" :key="user.username">
				<lobby-user :user="user" />
			</li>
		</ul>
		
		<div v-if="username != ''">
			<button-loadable @click="startGame" v-if="isPrivileged">Start Game</button-loadable>
		</div>
	</div>
</template>

<script>
import SetUsernameModal from './Lobby_SetUsernameModal';
import LobbyUser from './Lobby_User';
import ButtonLoadable from '@/components/ButtonLoadable.vue';
import { mapState } from 'vuex';

export default {
	name: 'Lobby',
	components: {
		SetUsernameModal,
		LobbyUser,
		ButtonLoadable
	},
	data() {
		return {
			minPlayers: 3,
			starting: false
		}
	},
	computed: {
		...mapState('user', [ 'username', 'isPrivileged' ]),
		...mapState('room', { allUsers: state => state.users })
	},
	methods: {
		async startGame(btnCallback) {
			if (this.starting) return;
			// if (this.$store.state.room.users.length < this.minPlayers) {
			// 	this.$store.dispatch('error', { message: `At least ${this.minPlayers} players are needed to start a game!` });
			// 	btnCallback();
			// 	return;
			// }

			console.debug("Starting the game!");
			this.starting = true;
			await this.$game.startGame();
			this.starting = false;
			btnCallback();
		}
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
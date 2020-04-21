<template>
	<div id="lobby">
		<h1>Lobby!</h1>

		<!-- TODO: turn this username field in to its own component -->
		<div v-if="this.$store.state.user.username == ''">
			<input type="text" @keyup.enter="addUser" v-model="username" autofocus>
			<br>
			<button @click="addUser">Set Username</button>
		</div>

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
import dbManager from '../dbManager'
export default {
	name: 'Lobby',
	data () {
		return {
			username: localStorage.getItem('username') || '', // used only to send to dbManager
			canStartGame: true
		}
	},
	methods: {
		addUser() {
			if(this.$store.state.room.users.some((user) => user.username == this.username)) { // Is there already a user with this name?
				console.log(`Username ${this.username} already in use :(`);
				this.username = '';
				return;
			}

			localStorage.setItem('username', this.username);
			dbManager.addUser(this.username);
		},
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
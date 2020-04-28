<template>
	<div id="home">
		<h1>Pain in my Deck!</h1>

		<input type="text" v-model="roomId" @keyup.enter="joinRoom" placeholder="Room ID">
		<br>
		<button @click="joinRoom">Join Game</button>
		<button @click="createRoom">Start a new Game!</button>
	</div>
</template>

<script>
import dbManager from '@/dbManager';

export default {
	name: 'Home',
	data () {
		return {
			roomId: ''
		}
	},
	methods: {
		joinRoom () {
			if(this.roomId == "") return;
			const playing = this.roomId.charAt(0) == "P"; // for testing

			let roomId = this.roomId;
			if (playing) roomId = roomId.substring(1);

			dbManager.joinRoom(roomId).then(() => {
				playing ? this.$router.push('Game') : this.$router.push('Lobby');
			}).catch((err) => {
				console.error(err);
				this.roomId = "";
				// TODO: show error for incorrect room ID
			});
		},
		createRoom () {
			dbManager.createRoom().then(roomId => {
				this.roomId = roomId
				dbManager.joinRoom(roomId).then(() => {
					this.$router.push('Lobby');
				});
			}).catch((err) => {
				console.error(err);
			});
		}
	}
}
</script>

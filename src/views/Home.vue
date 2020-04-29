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
			this.$router.push({ name: 'lobby', params: {roomId: this.roomId} });
		},
		createRoom () {
			dbManager.createRoom().then(roomId => {
				this.$router.push({ name: 'lobby', params: {roomId: roomId} });
			}).catch((err) => {
				console.error(err);
			});
		}
	}
}
</script>

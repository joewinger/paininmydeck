<template>
	<div id="home">
		<h1>Pain in my Deck!</h1>

		<input type="text" v-model="roomId" @keyup.enter="joinRoom" placeholder="Room ID">
		<br>
		<button-loadable @click="joinRoom">Join Game</button-loadable>
		<button-loadable @click="createRoom">Start a new Game!</button-loadable>
	</div>
</template>

<script>
import dbManager from '@/dbManager';
import ButtonLoadable from '@/components/ButtonLoadable';

export default {
	name: 'Home',
	components: {
		ButtonLoadable
	},
	data () {
		return {
			roomId: ''
		}
	},
	methods: {
		joinRoom (btnCallback) {
			if(this.roomId == "") return;
			btnCallback();
			this.$router.push({ name: 'lobby', params: {roomId: this.roomId} });
		},
		async createRoom (btnCallback) {
			let roomId = await dbManager.createRoom();

			if(roomId !== false) {
				this.$router.push({ name: 'lobby', params: {roomId: roomId} });
			}
			
			btnCallback();
		}
	}
}
</script>

<style>
#home {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
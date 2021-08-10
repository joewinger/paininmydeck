<template>
	<div id="home">
		<h1 class="logo">
			<span>Pain</span>
			<span>in my</span>
			<span>Deck</span>
		</h1>

		<h3>Join a game</h3>
			<input type="text" v-model="roomId" @keyup.enter="joinRoom()" placeholder="Room ID">
			<button-loadable @click="joinRoom" class="primary" style="margin-top: -5px;">Join Game</button-loadable>
		<h3>Or start your own</h3>
		<div style="display: flex; gap: 5px;">
			<button-loadable @click="createRoom">Start a new Game</button-loadable>
		</div>
	</div>
</template>

<script>
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
		joinRoom (btnCallback = () => {}) {
			if (this.roomId != "") this.$router.push({ name: 'lobby', params: {roomId: this.roomId} });
			else this.$store.dispatch('error', { message: 'Please enter a valid room number! 🤡' });
			
			btnCallback();
		},
		async createRoom (btnCallback = () => {}) {
			let roomId = await this.$game.createRoom();

			if (roomId !== false) this.$router.push({ name: 'lobby', params: {roomId: roomId} });
			else this.$store.dispatch('error', { message: 'Error creating room :( Try again in a little while.' });
			
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
	justify-content: center;
	gap: 15px;

	height: 100%;
}
#home h1.logo {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;

	width: 25vmin;
	height: 25vmin;
	padding: 3vmin;
	
	border: solid 0.8vmin var(--primary-300);
	border-radius: 15px;

	color: var(--primary-300);
  font-family: 'Inter', sans-serif;
	font-size: 6vmin;
	font-weight: 800; 
	text-transform: uppercase;
}
#home h3 {
	margin-bottom: 0;
}
</style>
<template>
	<div id="home">
		<img id="main-logo" src="@/assets/logo-orange.svg" alt="Pain In My Deck!" @click="showVersion = !showVersion">
		<h2 class="subtitle">An online Cards Against Humanity clone built for phones (and humans).</h2>

		<div class="game-controls">
			<div class="join-group">
				<input class="room-input" type="text" v-model="roomId" @keyup.enter="joinRoom()" placeholder="ROOM ID">
				<div class="buttons" style="display: flex; gap: 5px;"	>
					<button-loadable @click="joinRoom" class="primary btn-joinroom">PLAY</button-loadable>
					<button-loadable @click="joinRandomRoom" style="padding: 9px;"><ion-icon name="shuffle" title="Join a Random Room" /></button-loadable>
				</div>
			</div>
			<div class="links">
				<link-loadable @click="createRoom">START A NEW GAME</link-loadable>
			</div>
		</div>

		<span class="commitHash" v-if="showVersion">{{ $commitHash }}</span>
	</div>
</template>

<script>
import ButtonLoadable from '@/components/ButtonLoadable';
import LinkLoadable from '@/components/LinkLoadable.vue';

export default {
	name: 'Home',
	components: {
		ButtonLoadable,
		LinkLoadable
	},
	data () {
		return {
			roomId: '',
			showVersion: false
		}
	},
	methods: {
		joinRoom (btnCallback = () => {}) {
			if (this.roomId != "") this.$router.push({ name: 'lobby', params: {roomId: this.roomId} });
			else this.$store.dispatch('error', { message: 'Please enter a valid room number! 🤡' });
			
			btnCallback();
		},
		async joinRandomRoom (btnCallback = () => {}) {
			let roomID = await this.$game.findRandomRoom();

			if (roomID) this.$router.push({ name: 'lobby', params: {roomId: roomID} });
			else this.$store.dispatch('error', { message: 'No public games available to join :\'(' });
				
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

<style lang="scss">
#home {
	position: absolute;
	top: 0;
	left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
	justify-content: center;
	gap: 15px;

	height: 100%;
	width: 100%;
	
	#main-logo {
		max-width: 90%;
		
		filter: drop-shadow(0px 2px 0px #C89D30) drop-shadow(0px 2px 0px #B08C31);
		
		@media screen and (max-width: 550px) {
			filter: drop-shadow(0px 1px 0px #C89D30) drop-shadow(0px 1px 0px #B08C31);
		}
	}

	h2.subtitle {
		font-size: 24px;
		color: #6e6e75;
		text-align: center;

		max-width: min(430px, 95vw);
		margin-top: 10px;

		@media screen and (max-width: 550px) {
			font-size: 20px;
		}
	}

	.game-controls {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		width: min(450px, 70vw);
		padding: 24px 0;

		background-color: #F6F6F8;
		border-radius: 15px;
		box-shadow: 0px 4px 4px #E0E0E0;
		
		.join-group {
			display: flex;
			gap: 5px;
			align-items: center;
			flex-direction: row;

			@media screen and (max-width: 650px) {
				flex-direction: column;
			}

			input.room-input {
				width: 200px;

				font-weight: 700;
				font-size: 24px;
				letter-spacing: 20%;

				border: 2px solid #E0E0E0;
				box-sizing: border-box;
				border-radius: 15px;

				&::placeholder {
					color: #E0E0E0;
				}
			}
		}

		button {
			border-radius: 15px;

			&.btn-joinroom {
				font-family: "Bungee";
				font-size: 24px;
				height: 44px;
				padding: 0 24px;

				text-shadow: 0 1px 0 #C89D30, 0 2px 0 #B08C31;

				&:hover {
					text-shadow: 0 1px 0 #C89D30;
				}
			}
		}

		.links {
			display: flex;
			justify-content: center;
			align-items: center;
			flex-direction: row;

			padding-top: 16px;

			a {
				font-weight: 700;
				font-size: 14px;
				color: #828282;
				border-bottom: 1px solid #828282;
				font-style: normal;

				cursor: pointer;
			}
		}
	}
}

.commitHash {
	position: fixed;
	bottom: 5px;
	left: 50%;
	transform: translateX(-50%);

	font-size: 0.7rem;
}
.commitHash::before {
	content: 'version '
}
</style>
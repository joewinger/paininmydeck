<template>
	<div id="home">
		<section id="header">
			<div class="bg-image"></div>
			<div class="game-actions">
				<h1 class="logo" @click="showVersion = !showVersion">
					<span>Pain</span>
					<span>in my</span>
					<span>Deck</span>
				</h1>

				<h3>Join a game</h3>
				<input type="text" v-model="roomId" @keyup.enter="joinRoom()" placeholder="Room ID">
				<div style="display: flex; gap: 5px; margin-top: -5px; align-items: center;">
					<button-loadable @click="joinRoom" class="primary">Join Game</button-loadable>
					or
					<button-loadable @click="joinRandomRoom" style="padding: 9px;"><ion-icon name="shuffle" title="Join a Random Room" /></button-loadable>
				</div>

				<h3>Or start your own</h3>
				<div style="display: flex; gap: 5px;">
					<button-loadable @click="createRoom">Start a new Game</button-loadable>
				</div>

				<span class="commitHash" v-if="showVersion">{{ $commitHash }}</span>
			</div>
		</section>
		<section id="about" class="content">
			<h1>About</h1>
			<p>Pain in my Deck is an online, mobile-first <a href="https://www.cardsagainsthumanity.com/">Cards Against
			Humanity</a> clone. It's designed specifically with mobile in mind, allowing anyone with access to the internet
			to join & play. This app is still in development, so there will be bugs and glitches. Feel free to help out by
			reporting things that aren't working or suggesting new features.</p>
			<img src="" alt="">
		</section>
		<section id="features" class="content">
			<h1>Features</h1>
			<ul>
				<li><b>Trashable Cards</b> - Don't like your card? Try swiping to the right & trashing it to be re-dealt something (hopefully) better</li>
				<li><b>Blank Cards</b> - Our cards suck. Write your own to impress your friends</li>
				<li><b>Family Mode</b> - Let grandma play without having to reveal your pornography addiction</li>
				<li><b>Round History</b></li>
				<li><b>Join by Link</b></li>
			</ul>
			<h2>Coming Soon</h2>
			<ul class="coming-soon">
				<li><b>TV Mode</b> - link up to a TV and play with your friends. Allow spectators to see the question and the submitted cards.</li>
				<li><b>Deck Editor</b> - create, save, and share custom decks of cards!</li>
			</ul>
		</section>
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

<style>
#home {
	position: absolute;
	top: 0;
	left: 0;

	height: 100%;
	width: 100%;  
}

#header {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;

	position: relative;

	width: 100vw;
	height: 100%;
}

#header .bg-image {
	position: absolute;
	top: 0;
	left: 0;

	width: 100vw;
	height: 100%;

	--overlay-color: hsla(44, 5%, 80%, 30%);

	background-color: #F6F6F5;
	background-image: linear-gradient(0deg, var(--overlay-color), var(--overlay-color)), url('../assets/header-bg.png');
	background-position-y: center;
	background-position-x: center;
	background-size: cover;
	background-repeat: no-repeat;
	filter: blur(3px);

	z-index: -1;
}

#header .game-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
	justify-content: center;
	gap: 15px;

	height: 80vh;
}

#header .game-actions input[type="text"] {
	background-color: transparent;
	border-color: var(--gray-300);
}

.content {
	padding: 20px 20vw;

	font-size: 16px;
	line-height: 1.5;
}
@media screen and (max-width: 875px) {
	.content {
		padding: 20px 10vw;
	}
}

#about {
	position: relative;
}
#about::before {
	content: '';
	position: absolute;
	
	width: 20px;
	height: 20px;

	border: solid 2px var(--primary-300);
	border-left: none;
	border-top: none;

	top: -35px;
	left: 50%;
	transform: translateX(-50%) rotate(45deg);
}

#features ul {
	padding-left: 40px;
	list-style-type: disc;
}
@media screen and (max-width: 600px) {
	#features ul {
		padding-left: 10px;
	}
}

#features li {
	padding-bottom: 5px;
}

#features h2 {
	font-size: 1.2em;
	text-align: center;
}

#home h1.logo {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;

	width: max(25vmin, 90px);
	height: max(25vmin, 90px);
	padding: max(3vmin, 10.8px);
	margin-top: 0;
	
	border: solid max(0.8vmin, 3px) var(--primary-300);
	border-radius: 15px;

	color: var(--primary-300);
  font-family: 'Inter', sans-serif;
	font-size: max(6vmin, 22px);
	font-weight: 800; 
	text-transform: uppercase;
}
#home h3 {
	margin-bottom: 0;
}

.commitHash {
	position: absolute;
	bottom: 5px;
	left: 5px;

	font-size: 0.7rem;
}
.commitHash::before {
	content: 'version '
}
</style>
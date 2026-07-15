<template>
	<div id="navbar">
		<div id="navbar-back" @click="router.replace('/')" v-if="game.roomId !== null">
			<ion-icon name="arrow-back-circle-outline" />
		</div>
		<div id="navbar-title">
			<img src="@/assets/logo-white.svg" alt="Pain In My Deck!" height="50%"/>
		</div>
		<transition name="navbar-info">
			<div id="navbar-info" v-if="game.username !== ''" @click="copyRoomId">
				Room<br/>{{ game.roomId }}
			</div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const game = useGameStore();

async function copyRoomId() {
	if (!game.roomId) return;
	try {
		await navigator.clipboard.writeText(game.roomId);
	} catch {
		// Clipboard access can be denied; the frozen UI intentionally has no toast.
	}
}
</script>

<style>
#navbar {
	position: sticky;
	top: 0;

	width: 100%;
	height: 100%;

	background: var(--gray-400);

	color: #fff;
	-webkit-user-select: none;
     -moz-user-select: none;
			-ms-user-select: none;
					user-select: none;
	
	z-index: 2400;
}

#navbar-back {
	display: flex;
	align-items: center;
	justify-content: center;

	height: 100%;
	left: 7px;

	position: absolute;

	cursor: pointer;

	transition: transform 0.2s ease;
}
#navbar-back:hover {
	transform: scale(1.2);
}
#navbar-back ion-icon {
	grid-column: 1;
	font-size: 20pt;
}

#navbar-title {
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	width: 80%;
	left: 10%;
	height: 100%;

	font-weight: 500;
}

#navbar-info {
	display: flex;
	align-items: center;
	position: absolute;
	right: 10px;

	height: 100%;
	
	font-size: 0.8em;

	transition: transform 0.2s ease-out;
}

.navbar-info-enter-from, .navbar-info-leave-to {
	transform: translateX(200%);
}
</style>

<template>
	<div id="app">
		<nav-bar />
		<div id="row-content">
			<router-view v-slot="{ Component }">
				<transition :name="transitionName">
					<component :is="Component" />
				</transition>
			</router-view>
		</div>
		<status-menu v-if="game.roomId !== null" />
		<error-toast />
		<interstitial />
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import StatusMenu from '@/components/StatusMenu/index.vue';
import ErrorToast from '@/components/ErrorToast.vue';
import Interstitial from '@/components/Interstitial.vue';
import { useGameStore } from '@/stores/game';

const route = useRoute();
const router = useRouter();
const game = useGameStore();
const transitionName = ref('default');
const routeOrder = ['home', 'lobby', 'game', 'gameover'];

watch(
	() => route.name,
	(to, from) => {
		if (from == null) {
			transitionName.value = 'default';
			return;
		}
		transitionName.value = routeOrder.indexOf(String(to)) > routeOrder.indexOf(String(from)) ? 'slide-left' : 'slide-right';
	},
);

watch(
	() => [game.phase, game.beingKicked, game.terminalExit] as const,
	([phase, beingKicked, terminalExit]) => {
		if (beingKicked || terminalExit !== null) {
			void router.replace({ name: 'home' });
			return;
		}
		if (['COLLECTING', 'JUDGING', 'REVEAL'].includes(phase) && route.name === 'lobby') {
			void router.replace({ name: 'game', params: { roomId: game.roomId } });
		}
		if (['FINISHED', 'CANCELLED'].includes(phase) && route.name !== 'gameover') {
			void router.replace({ name: 'gameover', params: { roomId: game.roomId } });
		}
	},
);

onBeforeUnmount(() => game.dispose());
</script>

<style>
#app {
	display: grid;
	grid-template-rows: [row-nav] var(--navbar-height) [row-content] 1fr;
	width: 100%;
	height: 100%;
}
#row-content {
	grid-row: row-content;
	position: relative;
}
#row-status {
	grid-row: row-status;
}

.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active,
.default-enter-active, .default-leave-active {
	transition: opacity 0.3s, transform 0.3s;
}
.slide-left-enter-from {
	opacity: 0;
	transform: translateX(100vw);
}
.slide-left-leave-to {
	opacity: 0;
	transform: translateX(-100vw);
}
.slide-right-enter-from {
	opacity: 0;
	transform: translateX(-100vw);
}
.slide-right-leave-to {
	opacity: 0;
	transform: translateX(100vw);
}
.default-enter-from {
	opacity: 0;
}
.default-leave-to {
	opacity: 0;
}
</style>

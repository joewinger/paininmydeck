<template>
	<div class="app-shell" :class="{ 'app-shell--tv': isTvRoute }">
		<nav-bar v-if="!isTvRoute" />
		<main class="app-content" :class="{ 'app-content--tv': isTvRoute }">
			<router-view v-slot="{ Component }">
				<transition :name="transitionName">
					<component :is="Component" />
				</transition>
			</router-view>
		</main>
		<status-menu v-if="game.roomId !== null && !isTvRoute" />
		<error-toast />
		<interstitial v-if="!isTvRoute" />
	</div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import StatusMenu from '@/components/StatusMenu/index.vue';
import ErrorToast from '@/components/ErrorToast.vue';
import Interstitial from '@/components/Interstitial.vue';
import { useGameStore } from '@/stores/game';

const route = useRoute();
const router = useRouter();
const game = useGameStore();
const isTvRoute = computed(() => route.meta.layout === 'tv');
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
		if (game.displayMode || isTvRoute.value) return;
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
.app-shell {
	display: grid;
	grid-template-rows: var(--navbar-height) minmax(calc(100svh - var(--navbar-height)), auto);
	width: 100%;
	min-height: 100svh;
	background: var(--pimd-canvas);
}

.app-content {
	position: relative;
	display: grid;
	grid-row: 2;
	min-width: 0;
	min-height: calc(100svh - var(--navbar-height));
}

.app-content > * {
	grid-area: 1 / 1;
	min-width: 0;
}

.app-shell--tv {
	display: block;
}

.app-content--tv {
	grid-row: auto;
	min-height: 100svh;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active,
.default-enter-active,
.default-leave-active {
	transition:
		opacity 0.24s ease,
		transform 0.24s ease;
}

.slide-left-enter-from {
	opacity: 0;
	transform: translateX(24px);
}

.slide-left-leave-to {
	opacity: 0;
	transform: translateX(-24px);
}

.slide-right-enter-from {
	opacity: 0;
	transform: translateX(-24px);
}

.slide-right-leave-to {
	opacity: 0;
	transform: translateX(24px);
}

.default-enter-from {
	opacity: 0;
}

.default-leave-to {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.slide-left-enter-active,
	.slide-left-leave-active,
	.slide-right-enter-active,
	.slide-right-leave-active,
	.default-enter-active,
	.default-leave-active {
		transition-duration: 0.01ms;
	}
}
</style>

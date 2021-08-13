<template>
	<div id="app">
		<nav-bar />
		<div id="row-content">
			<transition :name="transitionName">
				<router-view/>
			</transition>
		</div>
		<div id="row-status">
			<StatusMenu v-if="$store.state.room.roomId !== null" />
		</div>
		<error-toast />
		<interstitial />
	</div>
</template>

<script>
import NavBar from '@/components/NavBar';
import StatusMenu from '@/components/StatusMenu';
import ErrorToast from '@/components/ErrorToast';
import Interstitial from '@/components/Interstitial.vue';

export default {
	components: {
		NavBar,
		StatusMenu,
		ErrorToast,
		Interstitial
	},
	watch: {
		'$route' (to, from) {
			const routes = ['home', 'lobby', 'game', 'endgame'];
			this.transitionName = routes.indexOf(to.name) > routes.indexOf(from.name) ? 'slide-left' : 'slide-right';
		}
	}
}
</script>

<style>
#app {
	display: grid;
	grid-template-rows: [row-nav] var(--navbar-height) [row-content] 1fr [row-status] 70px;
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
.slide-right-enter-active, .slide-right-leave-active {
	transition: opacity 0.3s, transform 0.3s;
}
.slide-left-enter {
	opacity: 0;
	transform: translateX(100vw);
}
.slide-left-leave-to {
	opacity: 0;
	transform: translateX(-100vw);
}
.slide-right-enter {
	opacity: 0;
	transform: translateX(-100vw);
}
.slide-right-leave-to {
	opacity: 0;
	transform: translateX(100vw);
}
</style>
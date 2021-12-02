<template>
	<div id="app">
		<nav-bar />
		<div id="row-content">
			<transition :name="transitionName">
				<router-view/>
			</transition>
		</div>
		<status-menu v-if="$store.state.room.roomId !== null" />
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
	data() {
		return {
			transitionName: 'default'
		}
	},
	watch: {
		'$route' (to, from) {
			if (from.name == null) {
				this.transitionName = 'default';
				return;
			}

			const routes = ['home', 'lobby', 'game', 'gameover'];
			this.transitionName = routes.indexOf(to.name) > routes.indexOf(from.name) ? 'slide-left' : 'slide-right';
		}
	}
}
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
.default-enter {
	opacity: 0;
}
.default-leave-to {
	opacity: 0;
}
</style>
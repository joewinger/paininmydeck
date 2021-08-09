<template>
	<div id="app">
		<nav-bar />
		<div id="row-content">
			<router-view/>
		</div>
		<div id="row-status">
			<StatusMenu v-if="$store.state.room.roomId !== null" />
		</div>
		<error-toast />
	</div>
</template>

<script>
import NavBar from '@/components/NavBar';
import StatusMenu from '@/components/StatusMenu';
import ErrorToast from '@/components/ErrorToast';

export default {
	components: {
		NavBar,
		StatusMenu,
		ErrorToast
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
}
#row-status {
	grid-row: row-status;
}
</style>
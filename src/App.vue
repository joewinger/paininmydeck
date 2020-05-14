<template>
	<div id="app">
		<div id="row-content">
			<router-view/>
		</div>
		<div id="row-status">
			<StatusMenu v-if="$store.state.room.roomId !== null" />
		</div>
	</div>
</template>

<script>
import StatusMenu from '@/components/StatusMenu';

export default {
	components: {
		StatusMenu
	}
}
</script>

<style>
#app {
	display: grid;
	grid-template-rows: [row-nav] 42px [row-content] 1fr [row-status] 70px;
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
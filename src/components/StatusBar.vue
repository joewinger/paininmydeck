<template>
	<div id="statusBar">
		<StatusButton :text="$store.state.room.roomId"></StatusButton>
		<StatusButton text="chat"></StatusButton>
		<StatusButton :text="`${$store.state.user.points} points`"></StatusButton>
	</div>
</template>

<script>
import StatusButton from '@/components/StatusButton.vue';

export default {
	name: 'StatusBar',
	components: {
		StatusButton
	}
}
</script>

<style scoped>
#statusBar {
	display: flex;
	position: fixed;
	bottom: 0;
	left: 2.5vw;
	flex-direction: row;
	justify-content: space-evenly;
	align-items: center;

	width: 95vw;
	height: 60px;

	background: #FFFFFF;
	box-shadow: 0px 0px 10px rgba(130, 130, 130, 0.47);
	border-radius: 25px 25px 0px 0px;

}
</style>
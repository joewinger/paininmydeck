<template>
	<div id="statusMenu">
		<div id="statusBar">
			<StatusBarButton>{{$store.state.room.roomId}}</StatusBarButton>
			<StatusBarButton>chat</StatusBarButton>
			<StatusBarButton v-if="$route.name ==='Lobby'">settings</StatusBarButton>
			<StatusBarButton v-if="$route.name ==='Game'">{{$store.state.user.points}} points</StatusBarButton>
		</div>
		<div id="statusMenuContent">

		</div>
	</div>
</template>

<script>
import StatusBarButton from '@/components/StatusBarButton.vue';

export default {
	name: 'StatusMenu',
	components: {
		StatusBarButton
	}
}
</script>

<style scoped>
#statusMenu {
	display: flex;
	flex-direction: column;
	position: fixed;
	bottom: 0;
	left: 2.5vw;

	width: 95vw;

	background: #FFFFFF;
	box-shadow: 0px 0px 10px rgba(130, 130, 130, 0.47);
	border-radius: 25px 25px 0px 0px;

	-webkit-transition: all 0.3s ease;
	-moz-transition: all 0.3s ease;
	-ms-transition: all 0.3s ease;
	-o-transition: all 0.3s ease;
	transition: all 0.3s ease;
}

#statusMenu.hidden {
	bottom: -100px;
}

#statusBar {
	display: flex;
	flex: 0 0 60px;
	flex-direction: row;
	justify-content: space-evenly;
	align-items: center;
	width: 100%;
}
#statusMenuContent {
	flex: 1 0 500px;
	max-height: 0;

	transition: all 0.3s ease;
}
</style>
<template>
	<div id="statusMenuWrapper">
		<transition name="fade">
			<div class="backgroundEffect" v-if="currentMenu !== null" @click="currentMenu = null"></div>
		</transition>
		<div id="statusMenu" :class="{hidden: $store.state.user.username === ''}">
			<div id="statusBar">
				<StatusBarButton :class="{active: currentMenu === 'ROOM'}"     @click.native="toggleMenu('ROOM')"     >{{$store.state.room.roomId}}</StatusBarButton>
				<StatusBarButton :class="{active: currentMenu === 'CHAT'}"     @click.native="toggleMenu('CHAT')"     >chat</StatusBarButton>
				<StatusBarButton :class="{active: currentMenu === 'SETTINGS'}" @click.native="toggleMenu('SETTINGS')" v-if="$route.name ==='Lobby'">settings</StatusBarButton>
				<StatusBarButton :class="{active: currentMenu === 'POINTS'}"   @click.native="toggleMenu('POINTS')"   v-if="$route.name ==='Game'">{{$store.state.user.points}} points</StatusBarButton>
			</div>
			<div id="statusMenuContent">
				<transition name="slide">
					<StatusMenuContentRoom v-if="currentMenu === 'ROOM'"></StatusMenuContentRoom>
					<StatusMenuContentChat v-if="currentMenu === 'CHAT'"></StatusMenuContentChat>
					<StatusMenuContentSettings v-if="currentMenu === 'SETTINGS'"></StatusMenuContentSettings>
					<StatusMenuContentPoints v-if="currentMenu === 'POINTS'"></StatusMenuContentPoints>
				</transition>
			</div>
		</div>
	</div>
</template>

<script>
import StatusBarButton from '@/components/StatusBarButton.vue';
import StatusMenuContentRoom from '@/components/StatusMenuContentRoom.vue';
import StatusMenuContentChat from '@/components/StatusMenuContentChat.vue';
import StatusMenuContentSettings from '@/components/StatusMenuContentSettings.vue';
import StatusMenuContentPoints from '@/components/StatusMenuContentPoints.vue';

export default {
	name: 'StatusMenu',
	components: {
		StatusBarButton,
		StatusMenuContentRoom,
		StatusMenuContentChat,
		StatusMenuContentSettings,
		StatusMenuContentPoints
	},
	data() {
		return {
			currentMenu: null
		}
	},
	methods: {
		toggleMenu(menuName) {
			this.currentMenu === menuName ? this.currentMenu = null : this.currentMenu = menuName;
		}
	}
}
</script>

<style scoped>
#statusMenu {
	display: flex;
	flex-direction: column;
	position: fixed;
	bottom: 0;
	left: 3vw;

	width: 94vw;

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
	flex: 1 0 auto;
	overflow: hidden;
}

.slide-enter-active,
.slide-leave-active {
	-webkit-transition: all 0.5s ease;
	-moz-transition: all 0.5s ease;
	-ms-transition: all 0.5s ease;
	-o-transition: all 0.5s ease;
	transition: all 0.5s ease;
}
.slide-enter, .slide-leave-to {
	max-height: 0;
	opacity: 0;
	transform: translateY(200px);
}
.slide-enter-to, .slide-leave {
	max-height: 70vh;
	opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
	-webkit-transition: opacity 0.5s ease;
	-moz-transition: opacity 0.5s ease;
	-ms-transition: opacity 0.5s ease;
	-o-transition: opacity 0.5s ease;
	transition: opacity 0.5s ease;
}
.fade-enter, .fade-leave-to {
	opacity: 0;
}
.fade-enter-to, .fade-leave {
	opacity: 1;
}

.backgroundEffect {
	position: fixed;
	top: 0;
	left: 0;

	width: 100%;
	height: 100%;
	
	background: #4F4F4F64;
}
</style>
<template>
	<div id="statusMenuWrapper">
		<transition name="fade">
			<div class="backgroundEffect" v-if="currentMenu !== null" @click="currentMenu = null"></div>
		</transition>
		<div id="statusMenu" :class="{hidden: $store.state.user.username === ''}">
			<div id="statusBar">
				<StatusBarButton
					:class="{active: currentMenu === 'ROOM'}"
					@click.native="toggleMenu('ROOM')"
					>
					<ion-icon name="information-circle-outline"></ion-icon>
				</StatusBarButton>

				<StatusBarButton
					:class="{ active: currentMenu === 'CHAT' }"
					@click.native="toggleMenu('CHAT')"
					>
					<ion-icon :name="hasUnreadMessages ? 'chatbubble-ellipses-outline' : 'chatbubble-outline'"></ion-icon>
				</StatusBarButton>
				
				<StatusBarButton
					:class="{active: currentMenu === 'SETTINGS'}"
					@click.native="toggleMenu('SETTINGS')"
					v-if="$route.name === 'lobby'"
					>
					<ion-icon name="settings-outline"></ion-icon>
				</StatusBarButton>

				<StatusBarButton
					:class="{active: currentMenu === 'POINTS'}"
					@click.native="toggleMenu('POINTS')"
					v-if="$route.name === 'game' || $route.name === 'endgame'"
					>
					<ion-icon name="trophy-outline"></ion-icon>
				</StatusBarButton>
			</div>
			<div id="statusMenuContent">
				<transition name="slide" mode="out-in">
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
import StatusBarButton from './StatusBarButton';
import StatusMenuContentRoom from './StatusMenuContentRoom';
import StatusMenuContentChat from './StatusMenuContentChat';
import StatusMenuContentSettings from './StatusMenuContentSettings';
import StatusMenuContentPoints from './StatusMenuContentPoints';

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
			currentMenu: null,
			hasUnreadMessages: false,
		}
	},
	methods: {
		toggleMenu(menuName) {
			if(menuName === 'CHAT') {
				this.hasUnreadMessages = false;
			}
			this.currentMenu === menuName ? this.currentMenu = null : this.currentMenu = menuName;
		}
	},
	created() {
		this.unsubscribe = this.$store.subscribe((mutation, state) => {
			if(this.currentMenu === 'CHAT') return;
			if(mutation.type === 'room/updateChatMessages' && state.room.chatMessages.length > 0) {
				this.hasUnreadMessages = true;
			}
		});
	},
	beforeDestroy() {
		this.unsubscribe();
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
	max-height: 65vh;
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
	max-height: 65vh;
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

.alert::before {
	content: '';
	position: absolute;
	width: 6px;
	height: 6px;
	border-radius: 3px;
	background: #828282;
	top: -11px;
	left: calc(50% - 3px);
}

ion-icon {
	font-size: 24px;
	--ionicon-stroke-width: 42px;
}
</style>
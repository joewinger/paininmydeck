<template>
	<div id="statusMenuWrapper">
		<transition name="fade">
			<div class="backgroundEffect" v-if="currentMenu !== null" @click="currentMenu = null" />
		</transition>
		<div id="statusMenu" :class="{hidden: $store.state.user.username === '', open: open}">
			<div id="statusBar">
				<status-bar-button
					:class="{active: currentMenu === 'INFO'}"
					@click.native="toggleMenu('INFO')"
				>
					<ion-icon name="information-circle-outline"></ion-icon>
				</status-bar-button>

				<status-bar-button
					:class="{ active: currentMenu === 'CHAT', notification: hasUnreadMessages }"
					@click.native="toggleMenu('CHAT')"
				>
					<ion-icon name="chatbubble-outline"></ion-icon>
				</status-bar-button>
				
				<status-bar-button
					:class="{active: currentMenu === 'SETTINGS'}"
					@click.native="toggleMenu('SETTINGS')"
					v-if="$route.name === 'lobby'"
				>
					<ion-icon name="settings-outline"></ion-icon>
				</status-bar-button>

				<status-bar-button
					:class="{active: currentMenu === 'LEADERBOARD'}"
					@click.native="toggleMenu('LEADERBOARD')"
					v-if="$route.name === 'game' || $route.name === 'endgame'"
				>
					<ion-icon name="people-circle-outline"></ion-icon>
				</status-bar-button>
			</div>
			<div id="statusMenuContent-container">
				<transition name="slide" mode="out-in">
					<status-menu-content-info v-if="currentMenu === 'INFO'" />
					<status-menu-content-chat v-if="currentMenu === 'CHAT'" />
					<status-menu-content-settings v-if="currentMenu === 'SETTINGS'" />
					<status-menu-content-leaderboard v-if="currentMenu === 'LEADERBOARD'" />
				</transition>
			</div>
		</div>
	</div>
</template>

<script>
import StatusBarButton from './StatusBarButton';
import StatusMenuContentInfo from './StatusMenuContentInfo';
import StatusMenuContentChat from './StatusMenuContentChat';
import StatusMenuContentSettings from './StatusMenuContentSettings';
import StatusMenuContentLeaderboard from './StatusMenuContentLeaderboard';

export default {
	name: 'StatusMenu',
	components: {
		StatusBarButton,
		StatusMenuContentInfo,
		StatusMenuContentChat,
		StatusMenuContentSettings,
		StatusMenuContentLeaderboard
	},
	data() {
		return {
			currentMenu: null,
			hasUnreadMessages: false,
		}
	},
	computed: {
		open() {
			return this.currentMenu !== null
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

<style>
#statusMenuWrapper {
	position: relative;
	z-index: 2400;
}
#statusMenu {
	display: grid;
	grid-template-rows: 50px auto;
	position: fixed;
	bottom: 0;
	left: calc( 50% - 150px );

	width: 300px;
	bottom: 10px;

	background: #FFFFFF;
	box-shadow: 0px 0px 10px rgba(130, 130, 130, 0.47);
	border: 1px solid var(--gray-200);
	border-radius: 25px;

	-webkit-transition: all 0.3s ease;
	-moz-transition: all 0.3s ease;
	-ms-transition: all 0.3s ease;
	-o-transition: all 0.3s ease;
	transition: all 0.3s ease;

	overflow: hidden;
}

#statusMenu.hidden {
	bottom: -100px;
}

#statusBar {
	grid-row: 1;
	display: flex;
	flex-direction: row;
	justify-content: space-evenly;
	align-items: center;

	width: 100%;
}
#statusMenuContent-container {
	--gutter: 10px;
	grid-row: 2;
	display: grid;
	grid-template-columns: var(--gutter) 1fr var(--gutter);
	max-height: 65vh;

	-webkit-transition: padding-bottom 0.3s ease;
	-moz-transition: padding-bottom 0.3s ease;
	-ms-transition: padding-bottom 0.3s ease;
	-o-transition: padding-bottom 0.3s ease;
	transition: padding-bottom 0.3s ease;
}

#statusMenu.open #statusMenuContent-container {
	padding-bottom: var(--gutter);
}

.statusMenuContent {
	grid-column: 2;
	font-size: 1rem;
	font-weight: 500;
}
.statusMenuContent h1 {
	font-size: 1.2rem;
}
.statusMenuContent table {
	width: 100%;
}
.statusMenuContent > table > tr > td:first-of-type {
	text-align: left;
}
.statusMenuContent > table > tr > td:last-of-type {
	text-align: right;
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
	font-size: 20px;
	--ionicon-stroke-width: 42px;
}
</style>
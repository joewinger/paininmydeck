<template>
	<div id="statusMenuWrapper">
		<transition name="fade">
			<div class="backgroundEffect" v-if="currentMenu !== null" @click="currentMenu = null" />
		</transition>
		<div id="statusMenu" :class="{hidden: game.username === '', open: open}">
			<div id="statusBar">
				<status-bar-button
					:class="{active: currentMenu === 'INFO'}"
					@click="toggleMenu('INFO')"
					v-if="route.name === 'lobby'"
				>
					<ion-icon name="information-circle-outline"></ion-icon>
				</status-bar-button>

				<status-bar-button
					:class="{active: currentMenu === 'HISTORY'}"
					@click="toggleMenu('HISTORY')"
					v-if="route.name === 'game' || route.name === 'gameover'"
				>
					<ion-icon name="time"></ion-icon>
				</status-bar-button>

				<status-bar-button
					:class="{ active: currentMenu === 'CHAT', notification: hasUnreadMessages }"
					@click="toggleMenu('CHAT')"
				>
					<ion-icon name="chatbubble-outline"></ion-icon>
				</status-bar-button>
				
				<status-bar-button
					:class="{active: currentMenu === 'SETTINGS'}"
					@click="toggleMenu('SETTINGS')"
					v-if="route.name === 'lobby'"
				>
					<ion-icon name="settings-outline"></ion-icon>
				</status-bar-button>

				<status-bar-button
					:class="{active: currentMenu === 'LEADERBOARD'}"
					@click="toggleMenu('LEADERBOARD')"
					v-if="route.name === 'game' || route.name === 'gameover'"
				>
					<ion-icon name="people-circle-outline"></ion-icon>
				</status-bar-button>
			</div>
			<div id="statusMenuContent-container">
				<transition name="slide" mode="out-in">
					<component :is="currentComponent" v-if="currentComponent" @close-menu="currentMenu = null" />
				</transition>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import StatusBarButton from './StatusBarButton.vue';
import StatusMenuContentInfo from './content/Info.vue';
import StatusMenuContentHistory from './content/History.vue';
import StatusMenuContentChat from './content/Chat/index.vue';
import StatusMenuContentSettings from './content/Settings.vue';
import StatusMenuContentLeaderboard from './content/Leaderboard/index.vue';
import { useGameStore } from '@/stores/game';

type MenuName = 'INFO' | 'HISTORY' | 'CHAT' | 'SETTINGS' | 'LEADERBOARD';
const route = useRoute();
const game = useGameStore();
const currentMenu = ref<MenuName | null>(null);
const hasUnreadMessages = ref(false);
const open = computed(() => currentMenu.value !== null);
const menuComponents = {
	INFO: StatusMenuContentInfo,
	HISTORY: StatusMenuContentHistory,
	CHAT: StatusMenuContentChat,
	SETTINGS: StatusMenuContentSettings,
	LEADERBOARD: StatusMenuContentLeaderboard,
};
const currentComponent = computed(() => currentMenu.value ? menuComponents[currentMenu.value] : null);

function toggleMenu(menuName: MenuName) {
	if (menuName === 'CHAT') hasUnreadMessages.value = false;
	currentMenu.value = currentMenu.value === menuName ? null : menuName;
}

watch(() => game.chatMessages.at(-1)?.id, (messageId, previousMessageId) => {
	if (currentMenu.value !== 'CHAT' && messageId && messageId !== previousMessageId) {
		hasUnreadMessages.value = true;
	}
});

watch(() => route.name, (routeName) => {
	if (currentMenu.value === null || currentMenu.value === 'CHAT') return;
	const validMenus: MenuName[] = routeName === 'lobby'
		? ['INFO', 'CHAT', 'SETTINGS']
		: ['HISTORY', 'CHAT', 'LEADERBOARD'];
	if (!validMenus.includes(currentMenu.value)) currentMenu.value = null;
});
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
.slide-enter-from, .slide-leave-to {
	max-height: 0;
	opacity: 0;
	transform: translateY(200px);
}
.slide-enter-to, .slide-leave-from {
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
.fade-enter-from, .fade-leave-to {
	opacity: 0;
}
.fade-enter-to, .fade-leave-from {
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

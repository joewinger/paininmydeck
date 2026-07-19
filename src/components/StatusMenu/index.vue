<template>
  <div
    id="statusMenuWrapper"
    :data-persistent-chat="persistentChat"
    :class="{ 'statusMenuWrapper--hidden': game.username === '' }"
  >
    <transition name="fade">
      <button
        v-if="overlayOpen"
        type="button"
        class="backgroundEffect"
        aria-label="Close room tools"
        @click="closeMenu"
      />
    </transition>

    <aside
      id="statusMenu"
      :class="{
        hidden: game.username === '',
        open: toolMenuOpen,
        'statusMenu--chat-open': currentMenu === 'CHAT' && !persistentChat,
        'statusMenu--history-open': currentMenu === 'HISTORY',
      }"
      aria-label="Room tools"
    >
      <nav id="statusBar" aria-label="Room tool panels">
        <status-bar-button
          v-if="route.name === 'lobby'"
          label="Info"
          :active="currentMenu === 'INFO'"
          @click="toggleMenu('INFO')"
        >
          <ion-icon name="information-circle-outline"></ion-icon>
        </status-bar-button>

        <status-bar-button
          v-if="route.name === 'game' || route.name === 'gameover'"
          label="History"
          :active="currentMenu === 'HISTORY'"
          @click="toggleMenu('HISTORY')"
        >
          <ion-icon name="time"></ion-icon>
        </status-bar-button>

        <status-bar-button
          ref="chatButton"
          v-if="!persistentChat"
          label="Chat"
          :active="currentMenu === 'CHAT'"
          :notification="hasUnreadMessages"
          controls="statusMenuContent-chat"
          :expanded="currentMenu === 'CHAT'"
          @click="toggleMenu('CHAT')"
        >
          <ion-icon name="chatbubble-outline"></ion-icon>
        </status-bar-button>

        <status-bar-button
          v-if="route.name === 'lobby'"
          label="Settings"
          :active="currentMenu === 'SETTINGS'"
          @click="toggleMenu('SETTINGS')"
        >
          <ion-icon name="settings-outline"></ion-icon>
        </status-bar-button>

        <status-bar-button
          v-if="route.name === 'game' || route.name === 'gameover'"
          label="Scores"
          :active="currentMenu === 'LEADERBOARD'"
          @click="toggleMenu('LEADERBOARD')"
        >
          <ion-icon name="people-circle-outline"></ion-icon>
        </status-bar-button>
      </nav>

      <div id="statusMenuContent-container">
        <transition name="slide" mode="out-in">
          <component
            :is="currentToolComponent"
            v-if="currentToolComponent"
            @close-menu="closeMenu"
          />
        </transition>
      </div>
    </aside>

    <div
      ref="roomChatPanel"
      id="roomChatPanel"
      :class="{ 'roomChatPanel--visible': chatVisible }"
      :aria-hidden="!chatVisible"
      :inert="chatVisible ? undefined : true"
      @keydown.esc="closeChat"
    >
      <status-menu-content-chat />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import StatusBarButton from './StatusBarButton.vue';
import StatusMenuContentInfo from './content/Info.vue';
import StatusMenuContentHistory from './content/History.vue';
import StatusMenuContentChat from './content/Chat/index.vue';
import StatusMenuContentSettings from './content/Settings.vue';
import StatusMenuContentLeaderboard from './content/Leaderboard/index.vue';
import { useGameStore } from '@/stores/game';

type MenuName = 'INFO' | 'HISTORY' | 'CHAT' | 'SETTINGS' | 'LEADERBOARD';
const props = defineProps<{ persistentChat: boolean }>();
const route = useRoute();
const game = useGameStore();
const currentMenu = ref<MenuName | null>(null);
const hasUnreadMessages = ref(false);
const chatButton = ref<InstanceType<typeof StatusBarButton> | null>(null);
const roomChatPanel = ref<HTMLElement | null>(null);
const toolMenuOpen = computed(
  () => currentMenu.value !== null && currentMenu.value !== 'CHAT',
);
const chatVisible = computed(
  () => game.username !== '' && (props.persistentChat || currentMenu.value === 'CHAT'),
);
const overlayOpen = computed(
  () => game.username !== '' && (toolMenuOpen.value || (!props.persistentChat && chatVisible.value)),
);
const menuComponents = {
  INFO: StatusMenuContentInfo,
  HISTORY: StatusMenuContentHistory,
  SETTINGS: StatusMenuContentSettings,
  LEADERBOARD: StatusMenuContentLeaderboard,
};
const currentToolComponent = computed(() =>
  currentMenu.value && currentMenu.value !== 'CHAT' ? menuComponents[currentMenu.value] : null,
);

function toggleMenu(menuName: MenuName) {
  const opening = currentMenu.value !== menuName;
  if (menuName === 'CHAT') hasUnreadMessages.value = false;
  currentMenu.value = opening ? menuName : null;
}

function closeMenu(): void {
  currentMenu.value = null;
}

function closeChat(): void {
  if (props.persistentChat || currentMenu.value !== 'CHAT') return;
  currentMenu.value = null;
  void nextTick(() => chatButton.value?.focus());
}

watch(
  () => game.chatMessages.at(-1)?.id,
  (messageId, previousMessageId) => {
    if (!chatVisible.value && messageId && messageId !== previousMessageId) {
      hasUnreadMessages.value = true;
    }
  },
);

watch(chatVisible, (visible) => {
  if (visible) hasUnreadMessages.value = false;
});

watch(
  () => props.persistentChat,
  async () => {
    const messageLog = roomChatPanel.value?.querySelector<HTMLElement>('#chatMessages');
    const scrollTop = messageLog?.scrollTop;
    await nextTick();
    if (messageLog && scrollTop !== undefined) messageLog.scrollTop = scrollTop;
  },
);

watch(
  () => route.name,
  (routeName) => {
    if (currentMenu.value === null || currentMenu.value === 'CHAT') return;
    const validMenus: MenuName[] =
      routeName === 'lobby'
        ? ['INFO', 'CHAT', 'SETTINGS']
        : ['HISTORY', 'CHAT', 'LEADERBOARD'];
    if (!validMenus.includes(currentMenu.value)) currentMenu.value = null;
  },
);
</script>

<style>
#statusMenuWrapper {
  position: relative;
  z-index: 2450;
}

#statusMenuWrapper.statusMenuWrapper--hidden {
  pointer-events: none;
}

#statusMenu {
  position: fixed;
  bottom: max(12px, env(safe-area-inset-bottom));
  left: 50%;
  z-index: 2;
  display: grid;
  grid-template-rows: minmax(0, auto) 60px;
  width: min(440px, calc(100vw - 24px));
  max-height: calc(100svh - var(--navbar-height) - 24px);
  transform: translateX(-50%);
  border: 4px solid var(--pimd-ink);
  border-radius: 0;
  background-color: var(--pimd-paper);
  background-image:
    linear-gradient(var(--pimd-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--pimd-grid) 1px, transparent 1px);
  background-size: 18px 18px;
  box-shadow: 7px 8px 0 var(--pimd-primary-dark);
  overflow: hidden;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

#statusMenu::before {
  content: '';
  position: absolute;
  z-index: 3;
  top: -4px;
  left: 50%;
  width: 68px;
  height: 18px;
  transform: translateX(-50%) rotate(-2deg);
  background: rgb(87 205 189 / 88%);
  clip-path: polygon(4% 8%, 98% 0, 94% 94%, 0 100%);
  pointer-events: none;
}

#statusMenu.statusMenu--chat-open::before {
  display: none;
}

#statusMenu.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, calc(100% + 32px));
}

#roomChatPanel {
  --gutter: clamp(13px, 4vw, 22px);
  position: fixed;
  bottom: calc(max(12px, env(safe-area-inset-bottom)) + 64px);
  left: 50%;
  z-index: 1;
  display: grid;
  grid-template-columns: var(--gutter) minmax(0, 1fr) var(--gutter);
  width: min(440px, calc(100vw - 24px));
  max-height: calc(100svh - var(--navbar-height) - 88px);
  padding-block: 21px 17px;
  overflow: hidden;
  transform: translate(-50%, calc(100% + 72px));
  border: 4px solid var(--pimd-ink);
  border-bottom: 0;
  background-color: var(--pimd-paper);
  background-image:
    linear-gradient(var(--pimd-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--pimd-grid) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    visibility 180ms ease;
}

#roomChatPanel::before {
  position: absolute;
  z-index: 3;
  top: -4px;
  left: 50%;
  width: 68px;
  height: 18px;
  transform: translateX(-50%) rotate(-2deg);
  background: rgb(87 205 189 / 88%);
  clip-path: polygon(4% 8%, 98% 0, 94% 94%, 0 100%);
  pointer-events: none;
  content: '';
}

#roomChatPanel.roomChatPanel--visible {
  transform: translateX(-50%);
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

#statusMenuWrapper[data-persistent-chat='true'] {
  align-self: stretch;
  min-width: 0;
  height: 100%;
  padding: 20px 18px 24px 0;
}

#statusMenuWrapper[data-persistent-chat='true'] #roomChatPanel {
  position: sticky;
  top: calc(var(--navbar-height) + 20px);
  bottom: auto;
  left: auto;
  width: 100%;
  height: calc(100svh - var(--navbar-height) - 44px);
  min-height: min(460px, calc(100svh - var(--navbar-height) - 44px));
  max-height: calc(100svh - var(--navbar-height) - 44px);
  padding-block: 21px 17px;
  transform: translateY(24px) rotate(0.18deg);
  border-bottom: 4px solid var(--pimd-ink);
  box-shadow: 7px 8px 0 var(--pimd-primary-dark);
}

#statusMenuWrapper[data-persistent-chat='true']
  #roomChatPanel.roomChatPanel--visible {
  transform: rotate(0.18deg);
}

#statusMenuWrapper[data-persistent-chat='true']
  #roomChatPanel
  #statusMenuContent-chat {
  height: 100%;
  min-height: 0;
}

#statusBar {
  z-index: 2;
  display: grid;
  grid-row: 2;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  width: 100%;
  padding: 0;
  border-top: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
}

#statusMenuContent-container {
  --gutter: clamp(13px, 4vw, 22px);
  display: grid;
  grid-row: 1;
  grid-template-columns: var(--gutter) minmax(0, 1fr) var(--gutter);
  max-height: min(68vh, calc(100svh - var(--navbar-height) - 112px));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

#statusMenu.open #statusMenuContent-container {
  padding-block: 21px 17px;
}

#statusMenu.statusMenu--history-open #statusMenuContent-container {
  height: min(68vh, calc(100svh - var(--navbar-height) - 112px));
  overflow: hidden;
}

.statusMenuContent {
  grid-column: 2;
  width: 100%;
  min-width: 0;
  color: var(--pimd-ink);
  font-size: 0.95rem;
  font-weight: 650;
}

.statusMenuContent h1 {
  width: 100%;
  margin: 0 0 16px;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(1.05rem, 5vw, 1.35rem);
  font-weight: 400;
  line-height: 1.1;
  text-align: center;
  text-transform: uppercase;
}

.statusMenuContent h1::after {
  content: '';
  display: block;
  width: 76px;
  height: 5px;
  margin: 7px auto 0;
  transform: rotate(-1deg);
  background: var(--pimd-highlight);
  clip-path: polygon(0 20%, 100% 0, 96% 100%, 3% 82%);
}

.statusMenuContent table {
  width: 100%;
  border-spacing: 0;
  border-collapse: collapse;
}

.statusMenuContent tbody > tr {
  border-bottom: 2px dashed rgb(45 37 64 / 22%);
}

.statusMenuContent tbody > tr:last-child {
  border-bottom: 0;
}

.statusMenuContent th,
.statusMenuContent td {
  padding: 10px 4px;
  vertical-align: middle;
}

.statusMenuContent th {
  color: var(--pimd-ink);
  font-weight: 800;
  text-align: left;
}

.statusMenuContent td:last-child {
  text-align: right;
}

.status-menu-action {
  width: 100%;
  min-height: 48px;
  margin: 16px 0 0;
  padding: 11px 16px;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-primary);
  box-shadow: 4px 5px 0 var(--pimd-ink);
  color: var(--pimd-on-primary);
  font-family: 'Bungee', sans-serif;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.status-menu-action:hover {
  transform: translateY(-2px);
  border-color: var(--pimd-ink);
  background: var(--pimd-primary);
  color: var(--pimd-on-primary);
  box-shadow: 4px 7px 0 var(--pimd-ink);
}

.status-menu-action:active {
  transform: translate(3px, 4px);
  border-color: var(--pimd-ink);
  background: var(--pimd-primary-dark);
  color: var(--pimd-on-primary);
  box-shadow: 1px 1px 0 var(--pimd-ink);
}

.status-menu-action--danger {
  background: var(--pimd-danger);
  color: var(--pimd-paper);
}

.status-menu-action--danger:hover {
  background: var(--pimd-danger);
  color: var(--pimd-paper);
}

.status-menu-action--danger:active {
  background: var(--pimd-danger-dark);
  color: var(--pimd-paper);
}

.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(18px) rotate(0.5deg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 160ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.backgroundEffect {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  transform: none;
  border: 0;
  border-radius: 0;
  background: rgb(45 37 64 / 48%);
  backdrop-filter: blur(1.5px);
  cursor: default;
}

.backgroundEffect:hover,
.backgroundEffect:active {
  transform: none;
  border: 0;
  background: rgb(45 37 64 / 48%);
}

#statusMenu ion-icon {
  width: 22px;
  height: 22px;
  font-size: 22px;
  --ionicon-stroke-width: 42px;
}

@media (max-width: 420px) {
  #statusMenu {
    bottom: max(8px, env(safe-area-inset-bottom));
    width: calc(100vw - 16px);
  }

  #roomChatPanel {
    --gutter: 12px;
    bottom: calc(max(8px, env(safe-area-inset-bottom)) + 64px);
    width: calc(100vw - 16px);
  }

  #statusMenuContent-container {
    --gutter: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #statusMenu,
  #roomChatPanel,
  .slide-enter-active,
  .slide-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition-duration: 0.01ms;
  }
}

@media (forced-colors: active) {
  #statusMenu,
  #roomChatPanel,
  #statusBar,
  .status-menu-action {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }

  .backgroundEffect {
    background: transparent;
  }
}
</style>

<template>
  <div id="lobby" class="pimd-screen lobby-screen">
    <set-username-modal v-if="game.needsProfile || game.username === ''" />

    <div class="lobby-layout">
      <header class="pimd-paper lobby-room-card">
        <span class="pimd-tape lobby-room-card__tape" aria-hidden="true"></span>
        <p class="pimd-eyebrow">Pass this around the table</p>
        <h1>
          <span>Room</span>
          <strong>{{ game.roomId ?? '-----' }}</strong>
        </h1>
        <p class="lobby-room-card__note">Share the code, pick a name, and settle in.</p>
        <span class="lobby-room-card__stamp" aria-hidden="true">
          {{ game.isPrivileged ? 'Host copy' : 'Guest copy' }}
        </span>
      </header>

      <section class="lobby-roster" aria-labelledby="lobby-roster-title">
        <div class="pimd-section-label">
          <h2 id="lobby-roster-title">At the table</h2>
        </div>
        <p class="lobby-roster__count">
          {{ game.users.length }} {{ game.users.length === 1 ? 'player' : 'players' }} checked in
        </p>
        <info-bar v-if="connectionInfo" :text="connectionInfo" />
        <ol>
          <li v-for="(user, index) in game.users" :key="user.playerId">
            <lobby-user :user="user" :position="index + 1" />
          </li>
        </ol>
      </section>

      <aside v-if="game.username !== ''" class="lobby-controls">
        <section v-if="game.isPrivileged" class="pimd-paper lobby-controls__sheet">
          <p class="pimd-eyebrow">Host controls</p>
          <h2>The table is yours</h2>
          <p>Start whenever everyone you invited has made it in.</p>
          <button-loadable class="pimd-primary-button" @click="startGame">
            Start Game
          </button-loadable>
          <a
            class="pimd-secondary-button lobby-tv-link"
            :href="tvUrl"
            target="_blank"
            rel="noopener"
          >
            Open TV mode
          </a>
        </section>

        <section v-else class="pimd-paper lobby-controls__sheet lobby-controls__sheet--guest">
          <p class="pimd-eyebrow">You’re checked in</p>
          <h2>Hold tight</h2>
          <p>The host will start the game when the table is set.</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import SetUsernameModal from './Lobby_SetUsernameModal.vue';
import LobbyUser from './Lobby_User.vue';
import ButtonLoadable from '@/components/ButtonLoadable.vue';
import InfoBar from '@/components/InfoBar.vue';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const router = useRouter();
const starting = ref(false);
const tvUrl = computed(() =>
  router.resolve({ name: 'tv', params: { roomId: game.roomId ?? '' } }).href,
);
const connectionInfo = computed(() => {
  if (game.connectionState === 'connecting') return 'Connecting to the room...';
  if (game.connectionState === 'reconnecting') return 'Reconnecting to the room...';
  const disconnected = game.users
    .filter((player) => !player.connected)
    .map((player) => player.displayName);
  if (disconnected.length === 1) return `Waiting for ${disconnected[0]} to reconnect...`;
  if (disconnected.length > 1)
    return `Waiting for ${disconnected.join(', ')} to reconnect...`;
  return '';
});

async function startGame(done: () => void) {
  if (starting.value) return;
  starting.value = true;
  try {
    await game.startGame();
  } catch {
    // The store reports command failures in the existing toast.
  } finally {
    starting.value = false;
    done();
  }
}
</script>

<style scoped>
.lobby-screen {
  min-height: calc(100svh - var(--navbar-height));
  padding: clamp(20px, 4vw, 48px) 14px 118px;
}

.lobby-layout {
  display: grid;
  align-content: start;
  gap: 24px;
  width: min(100%, 1260px);
  margin-inline: auto;
}

.lobby-room-card,
.lobby-roster,
.lobby-controls {
  width: min(100%, 620px);
  margin-inline: auto;
}

.lobby-room-card {
  padding: 38px 22px 60px;
  transform: rotate(-0.7deg);
  text-align: center;
}

.lobby-room-card__tape {
  top: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(-8deg);
}

.lobby-room-card h1 {
  display: grid;
  margin: 13px 0 18px;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-weight: 400;
  line-height: 0.8;
  text-transform: uppercase;
}

.lobby-room-card h1 span {
  font-size: clamp(13px, 4vw, 18px);
  letter-spacing: 0;
}

.lobby-room-card h1 strong {
  font-size: clamp(56px, 17vw, 92px);
  font-weight: inherit;
  letter-spacing: 0.04em;
}

.lobby-room-card__note {
  max-width: 31ch;
  margin: 0 auto;
  color: var(--pimd-ink-soft);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.lobby-room-card__stamp {
  position: absolute;
  right: 18px;
  bottom: 17px;
  padding: 7px 9px 5px;
  transform: rotate(-7deg);
  border: 3px solid var(--pimd-primary-dark);
  color: var(--pimd-primary-dark);
  font-family: 'Bungee', sans-serif;
  font-size: 9px;
  line-height: 1;
  text-transform: uppercase;
}

.lobby-roster {
  display: grid;
  gap: 14px;
}

.lobby-roster__count {
  width: fit-content;
  margin: -5px auto 0;
  padding: 5px 9px 4px;
  transform: rotate(0.6deg);
  background: var(--pimd-meta);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 9px;
  line-height: 1;
  text-transform: uppercase;
}

.lobby-roster ol {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lobby-roster li:nth-child(odd) {
  transform: rotate(-0.3deg);
}

.lobby-roster li:nth-child(even) {
  transform: rotate(0.3deg);
}

.lobby-controls {
  display: grid;
}

.lobby-controls__sheet {
  display: grid;
  gap: 14px;
  padding: 31px 22px 34px;
  transform: rotate(0.45deg);
}

.lobby-controls__sheet h2 {
  margin: 0;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(25px, 7vw, 38px);
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
}

.lobby-controls__sheet > p:not(.pimd-eyebrow) {
  max-width: 35ch;
  margin: 0;
  color: var(--pimd-ink-soft);
  font-weight: 800;
  line-height: 1.4;
}

.lobby-controls__sheet .pimd-primary-button {
  margin-top: 7px;
}

.lobby-controls__sheet .lobby-tv-link {
  min-height: 48px;
  margin-top: 2px;
  font-size: clamp(11px, 2.5vw, 14px);
}

.lobby-controls__sheet--guest {
  border: 3px solid var(--pimd-ink);
  background-color: var(--pimd-highlight);
  background-image: none;
  clip-path: polygon(1% 2%, 99% 0, 100% 96%, 2% 100%);
}

@media (min-width: 780px) {
  .lobby-screen {
    padding-inline: clamp(26px, 5vw, 70px);
  }

  .lobby-layout {
    grid-template-columns: minmax(280px, 0.82fr) minmax(360px, 1.18fr);
    align-items: start;
    gap: clamp(28px, 5vw, 64px);
  }

  .lobby-room-card,
  .lobby-roster,
  .lobby-controls {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .lobby-room-card {
    grid-row: 1 / 3;
    min-height: 430px;
    padding: 62px 30px 52px;
  }

  .lobby-room-card h1 strong {
    font-size: clamp(62px, 5.8vw, 84px);
    letter-spacing: 0;
  }
}

@media (min-width: 1120px) {
  .lobby-layout {
    grid-template-columns: minmax(280px, 0.76fr) minmax(350px, 1fr) minmax(280px, 0.72fr);
    align-items: center;
    gap: clamp(28px, 3.5vw, 58px);
  }

  .lobby-room-card {
    grid-row: auto;
  }
}

@media (forced-colors: active) {
  .lobby-room-card__stamp,
  .lobby-controls__sheet--guest {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }
}
</style>

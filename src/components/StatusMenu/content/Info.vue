<template>
  <section id="statusMenuContent-info" class="statusMenuContent" aria-labelledby="room-info-title">
    <h1 id="room-info-title">Information</h1>
    <table>
      <caption class="status-info-caption">
        Current room information
      </caption>
      <tbody>
        <tr>
          <th scope="row">Room ID</th>
          <td class="room-info__code">{{ game.roomId }}</td>
        </tr>
        <tr>
          <th scope="row">Version</th>
          <td class="room-info__version">{{ commitHash }}</td>
        </tr>
        <tr v-if="game.gameState === 'PLAYING'">
          <th scope="row">Czar</th>
          <td>{{ game.czar?.displayName }}</td>
        </tr>
        <tr v-if="game.gameState === 'PLAYING'">
          <th scope="row">Round</th>
          <td>{{ game.turn.round }}</td>
        </tr>
      </tbody>
    </table>
    <button
      type="button"
      class="status-menu-action status-menu-action--danger"
      @click="router.replace('/')"
    >
      Leave Room
    </button>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { commitHash } from '@/config';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const game = useGameStore();
</script>

<style>
#statusMenuContent-info {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-direction: column;
}

.room-info__code {
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.room-info__version {
  overflow-wrap: anywhere;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 0.8rem;
}

.status-info-caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

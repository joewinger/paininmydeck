<template>
  <component
    :is="isKickable ? 'button' : 'div'"
    class="lobbyUser"
    :class="{ kickable: isKickable, disconnected: !user.connected }"
    :style="{ '--color-from': user.colorSet[0], '--color-to': user.colorSet[1] }"
    :type="isKickable ? 'button' : undefined"
    :title="title"
    :aria-label="isKickable ? `Remove ${user.displayName} from the room` : undefined"
    @click="kickPlayer"
  >
    <span class="lobbyUser__position" aria-hidden="true">{{ formattedPosition }}</span>
    <span class="lobbyUser__identity">
      <strong>{{ user.displayName }}</strong>
      <small>{{ statusLabel }}</small>
    </span>
    <span class="lobbyUser__color" aria-hidden="true">✱</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const props = withDefaults(defineProps<{ user: PlayerSummary; position?: number }>(), {
  position: 1,
});
const game = useGameStore();
const isSelf = computed(() => props.user.playerId === game.self?.playerId);
const isKickable = computed(() => game.isPrivileged && !isSelf.value);
const title = computed(() => (isKickable.value ? `Kick ${props.user.displayName}` : ''));
const formattedPosition = computed(() => String(props.position).padStart(2, '0'));
const statusLabel = computed(() => {
  if (!props.user.connected) return 'Reconnecting';
  if (isSelf.value && game.isPrivileged) return 'You / host';
  if (isSelf.value) return 'You';
  if (isKickable.value) return 'Click to remove';
  return 'At the table';
});

function kickPlayer() {
  if (isKickable.value) void game.kickPlayer(props.user.playerId).catch(() => undefined);
}
</script>

<style scoped>
.lobbyUser {
  position: relative;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 66px;
  margin: 0;
  padding: 10px 12px;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper);
  box-shadow:
    7px 8px 0 var(--color-from),
    9px 10px 0 var(--pimd-ink);
  color: var(--pimd-ink);
  line-height: 1.1;
  text-align: left;
}

.lobbyUser__position,
.lobbyUser__identity small {
  font-family: 'Bungee', sans-serif;
  font-size: 9px;
  line-height: 1;
  text-transform: uppercase;
}

.lobbyUser__position {
  align-self: start;
  padding-top: 4px;
}

.lobbyUser__identity {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.lobbyUser__identity strong {
  overflow-wrap: anywhere;
  font-size: 17px;
  line-height: 1.05;
}

.lobbyUser__identity small {
  color: var(--pimd-ink-soft);
}

.lobbyUser__color {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  transform: rotate(7deg);
  border: 2px solid var(--pimd-ink);
  background: linear-gradient(135deg, var(--color-from) 0 50%, var(--color-to) 50% 100%);
  color: var(--pimd-ink);
  font-size: 18px;
  line-height: 1;
}

.lobbyUser.disconnected {
  border-style: dashed;
  box-shadow:
    7px 8px 0 var(--pimd-paper-shadow),
    9px 10px 0 var(--pimd-ink);
}

.lobbyUser.kickable {
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
}

.lobbyUser.kickable:hover {
  transform: translateY(-2px) rotate(-0.2deg);
  border-color: var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow:
    7px 10px 0 var(--color-from),
    9px 12px 0 var(--pimd-ink);
  color: var(--pimd-ink);
}

.lobbyUser.kickable:active {
  transform: translate(5px, 6px);
  border-color: var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow:
    2px 2px 0 var(--color-from),
    4px 4px 0 var(--pimd-ink);
  color: var(--pimd-ink);
}

@media (forced-colors: active) {
  .lobbyUser,
  .lobbyUser.disconnected,
  .lobbyUser.kickable:hover,
  .lobbyUser.kickable:active,
  .lobbyUser__color {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }
}
</style>

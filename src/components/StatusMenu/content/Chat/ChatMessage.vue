<template>
  <div
    class="chatMessage"
    :class="{
      system: messageObj.type === 'system',
      'chatMessage--thread-end': lastInThread,
    }"
  >
    <span
      v-if="messageObj.type !== 'system'"
      class="sender"
      :style="`color: ${game.colorSetForPlayer(messageObj.senderPlayerId)[0]}`"
    >
      {{ messageObj.senderDisplayName }}
    </span>
    <span class="message">{{ messageObj.text }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

defineProps<{ messageObj: ChatMessage; lastInThread?: boolean }>();
const game = useGameStore();
</script>

<style scoped>
.chatMessage {
  display: grid;
  gap: 4px;
  width: fit-content;
  max-width: 88%;
  padding: 8px 10px 9px;
  transform: rotate(0.25deg);
  border: 2px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 3px 3px 0 var(--pimd-status);
  color: var(--pimd-ink);
  font-size: var(--font-size);
  line-height: 1.32;
}

.chatMessage:nth-child(even) {
  transform: rotate(-0.3deg);
  box-shadow: 3px 3px 0 var(--pimd-meta);
}

.chatMessage--thread-end {
  margin-top: 3px;
}

.chatMessage .sender {
  font-family: 'Bungee', sans-serif;
  font-size: 0.55rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.chatMessage .message {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.chatMessage.system {
  width: 100%;
  max-width: none;
  margin-block: 5px;
  padding: 7px 9px;
  transform: rotate(-0.5deg);
  border: 0;
  background: var(--pimd-highlight);
  box-shadow: none;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.6rem;
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  text-transform: uppercase;
  clip-path: polygon(1% 4%, 100% 0, 98% 96%, 0 100%);
}

@media (forced-colors: active) {
  .chatMessage,
  .chatMessage.system {
    border: 2px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
}
</style>

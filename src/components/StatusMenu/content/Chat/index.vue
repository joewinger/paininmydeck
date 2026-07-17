<template>
  <section id="statusMenuContent-chat" class="statusMenuContent" aria-labelledby="chat-title">
    <h1 id="chat-title">Chat</h1>
    <div id="chatMessages" role="log" aria-label="Room chat" aria-live="polite">
      <chat-message
        v-for="(message, index) in messages"
        :key="message.id"
        :message-obj="message"
        :last-in-thread="
          index === 0 || messages[index - 1].senderDisplayName !== message.senderDisplayName
        "
      />
    </div>
    <chat-input />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChatInput from './ChatInput.vue';
import ChatMessage from './ChatMessage.vue';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const messages = computed(() => [...game.chatMessages].reverse());
</script>

<style scoped>
#statusMenuContent-chat {
  --font-size: 0.82rem;
  display: grid;
  grid-template-rows: auto minmax(145px, 1fr) auto;
  gap: 12px;
  height: min(54vh, 470px);
  min-height: 290px;
}

#statusMenuContent-chat h1 {
  margin-bottom: 1px;
}

#chatMessages {
  display: flex;
  min-height: 0;
  flex-direction: column-reverse;
  gap: 8px;
  width: 100%;
  padding: 5px 5px 7px 1px;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-color: var(--pimd-meta) transparent;
}
</style>

<template>
  <form class="chatInput" @submit.prevent="sendMessage">
    <textarea
      ref="textarea"
      v-model="messageText"
      aria-label="Chat message"
      placeholder="Message the room…"
      maxlength="280"
      rows="1"
      @keydown.enter.prevent="sendMessage"
    />
    <button type="submit" aria-label="Send message">
      <ion-icon name="send" aria-hidden="true"></ion-icon>
    </button>
  </form>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const textarea = ref<HTMLTextAreaElement | null>(null);
const messageText = ref('');

watch(messageText, async () => {
  await nextTick();
  if (!textarea.value) return;
  textarea.value.style.height = 'auto';
  textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 92)}px`;
});

async function sendMessage() {
  const text = messageText.value.trim();
  if (!text) return;
  messageText.value = '';
  await game.sendChat(text).catch(() => undefined);
}
</script>

<style scoped>
.chatInput {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  align-items: end;
  min-height: 54px;
  max-height: 104px;
  padding: 3px;
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-meta);
}

.chatInput textarea {
  width: 100%;
  min-height: 44px;
  max-height: 92px;
  padding: 12px 10px 9px;
  resize: none;
  border: 0;
  border-radius: 0;
  outline: 0;
  background: transparent;
  color: var(--pimd-ink);
  font-family: 'Inter', sans-serif;
  font-size: var(--font-size);
  font-weight: 700;
  line-height: 1.35;
}

.chatInput textarea::placeholder {
  color: var(--pimd-ink-soft);
  opacity: 0.72;
}

.chatInput:focus-within {
  outline: 3px solid var(--pimd-ink);
  outline-offset: 4px;
  box-shadow: var(--pimd-focus);
}

.chatInput button {
  width: 44px;
  min-height: 44px;
  margin: 2px;
  padding: 0;
  transform: rotate(-2deg);
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-highlight);
  box-shadow: 3px 3px 0 var(--pimd-primary-dark);
  color: var(--pimd-ink);
}

.chatInput button:hover {
  transform: translateY(-2px) rotate(-2deg);
  border-color: var(--pimd-ink);
  background: var(--pimd-primary);
  color: var(--pimd-ink);
  box-shadow: 3px 5px 0 var(--pimd-primary-dark);
}

.chatInput button:active {
  transform: translate(2px, 2px) rotate(-2deg);
  border-color: var(--pimd-ink);
  background: var(--pimd-primary-dark);
  color: var(--pimd-paper);
  box-shadow: 1px 1px 0 var(--pimd-primary-dark);
}

.chatInput button ion-icon {
  font-size: 1.25rem;
}

@media (forced-colors: active) {
  .chatInput,
  .chatInput button {
    border: 3px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
}
</style>

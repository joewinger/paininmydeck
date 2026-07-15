<template>
	<div class="chatInput">
		<div class="chatInput-content">
			<textarea
				ref="textarea"
				v-model="messageText"
				@keydown.enter.prevent="sendMessage"
				maxlength=280
				rows=1
			/>
			<button @click="sendMessage" :style="{'--color': game.userColorSet[0], '--color-2': game.userColorSet[1] }"><ion-icon name="send"></ion-icon></button>
		</div>
	</div>
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
	textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 80)}px`;
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
	--button-size: 25px;
	--border-radius: 10px;

	display: flex;
	flex-direction: column-reverse;

	min-height: 20px;
	max-height: 80px;
	
	border: solid var(--gray-200) var(--ui-border-width);
	border-radius: var(--border-radius);

	overflow-y: hidden;
	z-index: 100;
}
.chatInput-content {
	display: grid;
	grid-template-columns: 1fr calc( var(--button-size) + 10px );
	align-items: end; /* Keep our button at the bottom no matter how tall the textarea gets */
}

.chatInput-content textarea {
	padding: 8px;
	margin: 1px 0;
	box-sizing: border-box;

	border: 0;
	border-radius: var(--border-radius) 0 0 var(--border-radius);

	text-align: left;
	font-size: var(--font-size);
	font-weight: normal;
	color: #555;

	background: transparent; /* For some reason, this occasionally clips the border on .chatInput by a pixel. This fixes that */
}

.chatInput-content textarea:active, .chatInput-content textarea:focus {
  outline: none;
}

.chatInput-content button {
	display: flex;
	align-items: center;
	justify-content: center;
	
	width: var(--button-size);
	height: var(--button-size);
	margin: 5px;
	padding: 0;

	color: var(--color);

	border-color: var(--color);
	border-radius: 100%;
}
.chatInput-content button:hover {
	background-color: var(--color);
	border-color: var(--color);
	color: var(--color-2);
}

.chatInput-content button ion-icon {
	font-size: var(--font-size);
}
</style>

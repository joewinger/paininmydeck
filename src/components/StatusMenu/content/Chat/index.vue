<template>
	<div id="statusMenuContent-chat" class="statusMenuContent">
		<div id="chatMessages" ref="messageContainer">
			<chat-message
				v-for="(message, index) in messages"
				:key=index
				:message-obj=message
				:last-in-thread="index === 0 ? true : messages[index-1].senderDisplayName !== message.senderDisplayName"
			/>
		</div>
		<chat-input />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChatInput from './ChatInput.vue';
import ChatMessage from './ChatMessage.vue';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const messages = computed(() => [...game.chatMessages].reverse());
</script>

<style>
#statusMenuContent-chat {
	--font-size: 0.9rem;
	display: grid;
	grid-template-rows: 1fr auto;
	gap: 5px;
	
	height: 50vh;
}

#chatMessages {
	display: flex;
	flex-direction: column-reverse;
	gap: 5px;

	width: 100%;
	margin-bottom: 10px;

	overflow-y: scroll;
}

</style>

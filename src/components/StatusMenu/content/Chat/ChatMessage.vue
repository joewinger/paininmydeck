<template>
	<div :class="{ chatMessage: true, system: messageObj.type === 'system' }">
		<span
			v-if="messageObj.type != 'system'"
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

<style>
.chatMessage {
	font-size: var(--font-size);
}
.chatMessage .sender {
	margin-right: 10px;
}
.chatMessage .message {
	font-weight: 400;
}
.chatMessage.system .message {
	display: flex;
	justify-content: center;
	align-items: center;
	
	font-weight: bold;
	text-align: center;
	padding: 5px 0;
}
</style>

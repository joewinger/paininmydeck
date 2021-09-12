<template>
	<div :class="{ chatMessage: true, system: messageObj.type === 'system' }">
		<span
			v-if="messageObj.type != 'system'"
			class="sender"
			:style="`color: ${$store.getters['room/getColorSetByUsername'](messageObj.sender)[0]}`"
			>
			{{ messageObj.sender }}
		</span>
		<span class="message">{{ messageObj.text }}</span>
	</div>
</template>

<script>
import dayjs from 'dayjs';

export default {
	name: 'ChatMessage',
	props: {
		messageObj: Object,
		lastInThread: Boolean
	},
	computed: {
		timestamp() {
			return dayjs(this.messageObj.timestamp).format('h:mm')
		}
	}
}
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
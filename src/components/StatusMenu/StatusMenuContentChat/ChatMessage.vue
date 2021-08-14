<template>
	<div class="chatMessage">
		<span class="sender"
			:style="`color: ${$store.getters['room/getColorSetByUsername'](messageObj.sender)[0]}`">
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
</style>
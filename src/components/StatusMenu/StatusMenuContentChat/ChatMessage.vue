<template>
	<div class="chatMessage">
		<div class="chatMessage-sender" :style="`color: ${$store.getters['room/getColorSetByUsername'](chatMessage.sender)[0]}`">{{ chatMessage.sender }}</div>
		<div class="chatMessage-text">{{ chatMessage.text }}</div>
		<div class="chatMessage-timestamp">{{ timestamp }}</div>
	</div>
</template>

<script>
import dayjs from 'dayjs';

export default {
	name: 'ChatMessage',
	props: {
		chatMessage: Object
	},
	computed: {
		timestamp() {
			return dayjs(this.chatMessage.timestamp).format('h:mm')
		}
	}
}
</script>

<style>
.chatMessage {
	display: flex;
	align-items: flex-start;

	min-height: 30px;
	transition: all 0.2s ease;
}
.chatMessage-sender {
	flex: 0 1 auto;

	font-weight: 700;
}
.chatMessage-text {
	flex: 1 1 100%;
	text-align: left;
	padding: 0 10px;
}
.chatMessage-timestamp {
	flex: 0 1 auto;
	
	font-size: 0.8em;
	font-style: italic;
	color: #828282;
}

.hidden {
	opacity: 0;
}
</style>
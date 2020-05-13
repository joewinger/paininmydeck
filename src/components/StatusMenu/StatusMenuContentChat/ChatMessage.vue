<template>
	<div class="chatMessage" :class="{ me: messageObj.sender === $store.state.user.username, lastInThread: this.lastInThread }">
		<div class="chatMessage-content">
			<div
				class="chatMessage-sender"
				v-if="lastInThread && messageObj.sender !== $store.state.user.username"
				:style="`background-color: ${$store.getters['room/getColorSetByUsername'](messageObj.sender)[0]}`"
			>
				{{ messageObj.sender.substring(0, 1) }}
			</div>
			<div class="chatMessage-text">{{ messageObj.text }}</div>
			<!-- <div
				class="chatMessage-timestamp"
				v-if=lastInThread
			>
				{{ this.timestamp }}
			</div> -->
		</div>
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
	display: grid;
	grid-template-columns: 70%;
	justify-items: start; /* Sorta like saying width: auto */

	margin-bottom: 5px;

	--sender-icon-size: 25px;
}
.chatMessage.lastInThread {
	margin-bottom: 15px;
}
.chatMessage.me {
	justify-content: end; /* Snap the whole div to the right of the screen*/
	justify-items: end; /* Align the contents of the div to the right of the div */
}

.chatMessage-content {
	display: grid;
	grid-template-columns: var(--sender-icon-size) 1fr;
  align-items: end; /* Snap everything to the bottom of the div. Specifically, align the sender icon to the bottom. */
	gap: 0 10px; /* Only gap the x-axis to add space between the sender icon and the message. We'll control the y-spacing individually to show relation within message threads */
}
.chatMessage.me .chatMessage-content {
	grid-template-columns: 1fr; /* No need for an icon column if we don't have an icon */
}

.chatMessage-sender {
	height: var(--sender-icon-size);
	width: var(--sender-icon-size);
	
	border-radius: 100%;

	font-size: 10pt;
	color: #FFF;
	font-weight: 500;
	line-height: var(--sender-icon-size);
	text-align: center;
	padding: 1px 0 0 1px; /* Not sure why this is needed, but it centers the letters */
	font-family: Helvetica, sans-serif;
}

.chatMessage-text {
	grid-column-start: 2;
	
	padding: 10px;
	
  border-radius: 15px;
  background: #eee;
	
	font-size: 11pt;
	font-weight: normal;
	text-align: left;
	color: #555;
}
.chatMessage.lastInThread .chatMessage-text {
  border-bottom-left-radius: 0;
}
.chatMessage.me .chatMessage-text {
  background: rgb(54, 136, 250);
  color: white;
  
  border-radius: 15px;
}
.chatMessage.me.lastInThread .chatMessage-text {
  border-bottom-right-radius: 0;
}

.chatMessage-timestamp {
  font-size: 0.7rem;
  grid-column-start: 2;

	margin-left: 5px;
	color: #828282;

	text-align: left;
}
.chatMessage.me .chatMessage-timestamp {
	text-align: right;
}

</style>
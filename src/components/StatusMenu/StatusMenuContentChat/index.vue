<template>
	<div id="statusMenuContent-chat" class="statusMenuContent">
		<div id="chatMessages" ref="messageContainer">
			<ChatMessage
				v-for="(message, index) in messages"
				:key=index
				:message-obj=message
				:last-in-thread="index === 0 ? true : messages[index-1].sender !== message.sender"
			/>
		</div>
		<ChatInput />
	</div>
</template>

<script>
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';

export default {
	name: 'StatusMenuContentChat',
	components: {
		ChatMessage,
		ChatInput
	},
	computed: {
		messages: {
			get() {
				return [...this.$store.state.room.chatMessages].reverse(); // Reverse the messages because they'll be displayed in a flex container with flex-direction: column-reverse
			}
		}
	}
}
</script>

<style>
#statusMenuContent-chat {
	display: grid;
	grid-template-rows: 1fr auto;
	gap: 5px;

	height: 50vh;
}

#chatMessages {
	display: flex;
	flex-direction: column-reverse;

	width: 100%;

	overflow-y: scroll;
}

</style>
<template>
	<div id="statusMenuContent-chat" class="statusMenuContent">
		<ol class="chatMessages" @scroll=scroll ref="messageContainer">
			<li v-for="(message, index) in $store.state.room.chatMessages" :key="index">
				<ChatMessage :chatMessage=message ref="message" />
			</li>
		</ol>
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
	methods: {
		scroll() {
			const messages = this.$refs.message;
			const messageContainerElement = this.$refs.messageContainer;
			for(let i = 0; i < messages.length; i++) {
				let currentElement = messages[i].$el;
				const topBound = messageContainerElement.getBoundingClientRect().top
				const currentTop = currentElement.getBoundingClientRect().top;
				const threshold = 20;
				
				if(currentTop < topBound + threshold) {
					currentElement.classList.add('hidden');
					// currentElement.style.opacity = (currentTop - topBound) / threshold;
				} else {
					currentElement.classList.remove('hidden');
				}
			}
		}
	}
}
</script>

<style>
#statusMenuContent-chat {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-direction: column;

	height: 50vh;
}

ol.chatMessages {
	position: relative;

	box-sizing: border-box;
	list-style: none;
	margin: 0;
	margin-bottom: -60px;
	padding: 0 20px;

	width: 100%;

	overflow-y: scroll;
}
ol.chatMessages > li:last-of-type {
	padding-bottom: 60px;
}
/* ol.chatMessages::after {
    content: '';
    top: 0;
    left: 0;
    height: 40px;
    right: 0;
		background: linear-gradient(to bottom, #FFF 0%, #FFF 100%)
    position: absolute;
} */

</style>
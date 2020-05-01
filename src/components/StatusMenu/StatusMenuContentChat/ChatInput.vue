<template>
	<div class="chatInput">
		<input type="text" v-model="messageText" @keyup.enter=sendMessage />
		<button @click=sendMessage>Send</button>
	</div>
</template>

<script>
export default {
	name: 'ChatInput',
	data() {
		return {
			messageText: ''
		}
	},
	methods: {
		sendMessage() {
			if(this.messageText === '') return;

			this.$store.dispatch('room/sendMessage', this.messageText);
			this.messageText = '';
		}
	}
}
</script>

<style scoped>
.chatInput {
	display: flex;
	flex-direction: row;

	align-items: center;

	margin-bottom: 20px;

	z-index: 100;
}
input {
	flex-grow: 2;
	text-align: left;
}
</style>
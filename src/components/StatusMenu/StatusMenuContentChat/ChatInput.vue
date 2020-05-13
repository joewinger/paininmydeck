<template>
	<div class="chatInput">
		<div class="chatInput-content">
			<textarea-autosize
				v-model="messageText"
				@keyup.ctrl.enter.native=sendMessage
				:max-height=80
				maxlength=280
				rows=1
			/>
			<button @click=sendMessage><ion-icon name="send"></ion-icon></button>
		</div>
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
	--button-size: 30px;
	--border-radius: 20px;

	display: flex;
	flex-direction: column-reverse;

	min-height: 40px;
	max-height: 80px;
	
	border: solid #bbb 1px;
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
	padding: 10px;
	margin: 1px 0;
	box-sizing: border-box;

	border: 0;
	border-radius: var(--border-radius) 0 0 var(--border-radius);

	text-align: left;
	font-size: 11pt;
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

	border-radius: 100%;
}

.chatInput-content button ion-icon {
	font-size: 10pt;
}
</style>
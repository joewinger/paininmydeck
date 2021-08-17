<template>
	<div class="chatInput">
		<div class="chatInput-content">
			<textarea-autosize
				v-model="messageText"
				@keydown.enter.native=sendMessage
				:max-height=80
				maxlength=280
				rows=1
			/>
			<button @click=sendMessage :style="{'--color': $store.getters['user/getColorSet'][0], '--color-2': $store.getters['user/getColorSet'][1] }"><ion-icon name="send"></ion-icon></button>
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
		// NOTE: If we're doing this to prevent new lines, we should just
		// remove the textarea-autosize plugin and use an <input>, but I'm
		// not sure if this change is permenant. 8/13/21
		sendMessage(event) {
			event.preventDefault();

			if(this.messageText === '') return;

			this.$store.dispatch('room/sendChatMessage', this.messageText);
			this.messageText = '';
		}
	}
}
</script>

<style scoped>
.chatInput {
	--button-size: 25px;
	--border-radius: 10px;

	display: flex;
	flex-direction: column-reverse;

	min-height: 20px;
	max-height: 80px;
	
	border: solid var(--gray-200) var(--ui-border-width);
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
	padding: 8px;
	margin: 1px 0;
	box-sizing: border-box;

	border: 0;
	border-radius: var(--border-radius) 0 0 var(--border-radius);

	text-align: left;
	font-size: var(--font-size);
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

	color: var(--color);

	border-color: var(--color);
	border-radius: 100%;
}
.chatInput-content button:hover {
	background-color: var(--color);
	border-color: var(--color);
	color: var(--color-2);
}

.chatInput-content button ion-icon {
	font-size: var(--font-size);
}
</style>
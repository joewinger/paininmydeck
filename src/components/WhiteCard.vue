<template>
	<div class="whiteCard" :class="{facedown: this.facedown, winner: this.isWinner, blank: this.isBlank }" @click="onClick">
		<div class="card-text" v-if="!facedown && !isBlank">{{ this.text }}</div>
		<textarea v-if="isBlank" v-model="blanktext" class="blank-input" :placeholder='"Blank\nCard"' @blur="onBlur" />
		<transition name="save-btn">
			<button v-if="isBlank && editing" class="save" @click="saveBlankCard"><ion-icon name="save" size="small" /></button>
		</transition>
		<div class="winner-credit" v-if="this.isWinner">
			Played by: {{this.$store.state.room.turn.winningCard.playedBy}}
		</div>
	</div>
</template>

<script>
export default {
	name: 'WhiteCard',
	props: {
		text: String,
		facedown: Boolean
	},
	data() {
		return {
			blanktext: '',
			editing: false
		}
	},
	computed: {
		isBlank() {
			return this.text.startsWith('%BLANK%');
		},
		isWinner() {
			if(this.$store.state.room.turn.winningCard !== null) {
				return this.$store.state.room.turn.winningCard.text === this.text;
			} else return false;
		}
	},
	methods: {
		onClick(mouseEvent) {
			if(this.text == null || this.facedown) return;

			if(this.isBlank) {
				let card = mouseEvent.target;
				if (card.classList.contains('whiteCard')) card.querySelector('.blank-input').focus();
				this.editing = true;
				return;
			}

			if(this.$store.getters['user/isCzar']) {
				this.$game.chooseCard(this.text);
			} else {
				if(this.$store.state.user.playedThisTurn) return;

				this.$game.playCard(this.text);
			}
		},
		onBlur(e) {
			// If we stop editing, the save button vanishes. If we click the
			// save button, don't stop editing until we've finished saving.
			if(e.relatedTarget && e.relatedTarget.classList.contains('save')) return;
			this.editing = false;
		},
		saveBlankCard() {
			this.editing = false;
			if (this.blanktext == '') {
				this.$store.dispatch('error', {message: "Blank cards can't be blank!"});
				return;
			}
			if (this.blanktext.startsWith('%BLANK%')) {
				this.$store.dispatch('error', {message: "Blank cards can't begin like that!"});
				this.blanktext = '';
				return;
			}
			this.$store.dispatch('user/updateBlankCard', {blankText: this.text, newText: this.blanktext});
		}
	}
}
</script>

<style>
.whiteCard {
	position: relative;
	display: inline-block;

	/* width: 200px;
	height: 260px; */
	max-width: 150px;
	min-width: 120px;
	height: 195px;
	padding: 15px;

	background: #fff;
	border-radius: 15px;
	border: var(--ui-border-width) solid var(--gray-200);
	box-shadow: 0px 4px 4px rgba(177, 177, 177, 0.25);

	color: var(--gray-500);
  font-family: aktiv-grotesk, Helvetica, sans-serif;
	text-align: left;
	font-size: clamp(1rem, 5.2vw, 1.25rem);
	font-weight: bold;

	cursor: pointer;
	transition: transform 0.3s, opacity 0.2s;
	transform-style: preserve-3d;
	-webkit-transform-style: preserve-3d;

	z-index: 1200;
}
.whiteCard:hover {
	transform: scale(1.03);
}

.whiteCard .card-text {
	backface-visibility: hidden;
}

.whiteCard.facedown {
  transform: rotateY( 180deg );
}

.winner, .winner:hover {
	transform: scale(1.1);
}

.whiteCard.blank {
	cursor: text;
}
.whiteCard.blank textarea {
	width: 100%;
	height: 100%;
	padding: 0;
	border: none;
	
	font: inherit;
	text-align: inherit;
	
	resize: none;
}
.whiteCard.blank textarea:focus {
	outline: none;
}
.whiteCard.blank textarea::placeholder {
	position: absolute;

	width: 60px;
	height: 50px;
	top: calc(50% - 25px);
	left: calc(50% - 30px);

	text-align: center;
	color: var(--gray-200);
}
.whiteCard.blank button.save {
	position: absolute;
	bottom: 5px;
	right: 5px;
	display: flex;
	align-items: center;
	justify-content: center;

	--size: 35px;
	width: var(--size);
	height: var(--size);
	padding: 0;
	margin: 0;
	
	border-radius: 100%;
	border-color: var(--accent-300);
	
	color: var(--accent-300);
}
.whiteCard.blank button.save:hover {
	background-color: var(--accent-300);
	transition: transform 0.2s ease;
	color: #fff;
}
.save-btn-enter, .save-btn-leave-to {
	transform: scale(0);
}
.save-btn-enter-to {
	transform: scale(1.1);
}
.winner-credit {
	position: absolute;
	color: #828282;

	left: 15px;
	bottom: 15px;

	font-size: 0.9em;
}
</style>
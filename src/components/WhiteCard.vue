<template>
	<div class="whiteCard" :class="{facedown: this.facedown, winner: this.isWinner, blank: this.isBlank }" @click="onClick">
		<div class="card-text" v-if="!facedown && !isBlank">{{ this.text }}</div>
		<textarea v-if="isBlank" v-model="blanktext" class="blank-input" :placeholder='"Blank\nCard"' @blur="onBlur" />
		<transition name="save-btn">
			<button v-if="isBlank && editing" class="btn-save" @click="submitBlankCard"><ion-icon name="checkmark" /></button>
		</transition>
		<div class="ribbon" v-if="this.isWinner">
			<div class="ribbon-content">
				<small>Played by</small>
				{{ this.$store.state.room.turn.winningCard.playedBy }}
			</div>
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
			editing: false,
			disableClicks: false
		}
	},
	computed: {
		isBlank() {
			return this.text.startsWith('%BLANK%');
		},
		isWinner() {
			if (this.$store.state.room.turn.winningCard !== null) {
				return this.$store.state.room.turn.winningCard.text === this.text;
			} else return false;
		}
	},
	methods: {
		onClick(mouseEvent) {
			if (this.text == null || this.facedown) return;

			if (this.isBlank) {
				let card = mouseEvent.target;
				if (card.classList.contains('whiteCard')) card.querySelector('.blank-input').focus();
				this.editing = true;
				return;
			}

			if (this.$store.getters['user/isCzar'] && !this.disableClicks && this.$store.state.room.turn.winningCard == null) {
				this.disableClicks = true;
				this.$game.chooseCard(this.text);
			} else {
				if (this.$store.state.user.playedThisTurn) return;

				this.$game.submitCard(this.text);
			}
		},
		onBlur(e) {
			// If we stop editing, the save button vanishes. If we click the
			// save button, don't stop editing until we've finished saving.
			if (e.relatedTarget && e.relatedTarget.classList.contains('btn-save')) return;
			this.editing = false;
		},
		submitBlankCard() {
			this.editing = false;
			this.blanktext = this.blanktext.trim();

			if (this.blanktext == '') {
				this.$store.dispatch('error', {message: "Blank cards can't be blank!"});
				return;
			}
			if (this.blanktext.startsWith('%BLANK%')) {
				this.$store.dispatch('error', {message: "Blank cards can't begin like that!"});
				this.blanktext = '';
				return;
			}
			this.$game.submitBlankCard(this.text, this.blanktext);
		}
	}
}
</script>

<style>
.whiteCard {
	position: relative;
	display: inline-block;

	/* OG size: 200 x 260 */
	max-width: 150px;
	min-width: 120px;
	height: 195px;
	padding: 0;

	background: #fff;
	border-radius: 15px;
	border: var(--ui-border-width) solid var(--gray-200);
	box-shadow: 0px 4px 4px rgba(177, 177, 177, 0.25);

	color: var(--gray-500);
  font-family: aktiv-grotesk, Helvetica, sans-serif;
	text-align: left;
	font-size: clamp(1rem, 5.2vw, 1.25rem);
	font-weight: bold;

  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: manual;
	scroll-behavior: smooth;
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
	max-height: 100%;
	overflow-y: scroll;
	padding: 15px;
	border-radius: 15px;

	-webkit-backface-visibility: hidden;
	backface-visibility: hidden;
}

.whiteCard.facedown {
  transform: rotateY( 180deg );
}

.winner, .winner:hover {
	transform: scale(1.1);
	z-index: 1250;
}

.whiteCard.blankfont { /* Used to show played blank cards with a hand written font */
	font-family: 'Nanum Pen Script', aktiv-grotesk, Helvetica, sans-serif;
	font-size: 1.7em;
}
.whiteCard.blank {
	cursor: text;
	font-family: 'Nanum Pen Script', aktiv-grotesk, Helvetica, sans-serif;
	font-size: 1.7em; /* Nanum Pen Script is smaller than Aktiv Grotesk, this comps for that. Calculation was done by eye, so not perfect. */
}
.whiteCard.blank textarea {
	width: 100%;
	/* I have no idea where these 4px are coming from, but without
	this there's a teensy bit of overscroll. */
	height: calc( 100% - 4px );
	padding: 15px;
	box-sizing: border-box;
	border: none;
	
	border-radius: 15px;

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

	font-family: aktiv-grotesk, Helvetica, sans-serif;
	font-size: clamp(1rem, 5.2vw, 1.25rem);
	text-align: center;
	color: var(--gray-200);
}
.whiteCard.blank button.btn-save {
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
.whiteCard.blank button.btn-save:hover {
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
.ribbon {
	--overhang: calc(1em + var(--ui-border-width));
	--color: var(--primary-300);
	--color-2: var(--primary-400);
	position: absolute;
	color: #828282;

	top: 60%;
	/* offset by 1em + the border, so when we come back -1em we hit the outside of the card */
	left: calc(var(--overhang) * -1);
	width: calc(100% + (var(--overhang) * 2));
	height: 2.2em;

	background-color: var(--color);

	/* Redefine font in case it's a blank card */
	font-family: aktiv-grotesk, Helvetica, sans-serif;
	font-size: clamp(1rem, 5.2vw, 1.25rem);
	text-align: center;
}
.ribbon::before, .ribbon::after {
	--length: 1.5em;
	content: "";
	position: absolute;
	bottom: -1em;

	border: 1em solid var(--color);

	z-index: -1;
}
.ribbon::before {
	left: calc(var(--length) * -1);
	border-right-width: var(--length);
	border-left-color: transparent;
}
.ribbon::after {
	right: calc(var(--length) * -1);
	border-left-width: var(--length);
	border-right-color: transparent;
}

.ribbon-content {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;

	height: 100%;

	color: white;
}
.ribbon-content small {
	font-size: 0.5em;
}
.ribbon-content small::before, .ribbon-content small::after {
	content: " - ";
}
.ribbon-content::before, .ribbon-content::after {
	content: "";
	position: absolute;
	bottom: -1em;
	border-color: var(--color-2) transparent transparent transparent;
	border-style: solid;
}
.ribbon-content::before {
	left: 0;
	border-width: 1em 0 0 1em;
}
.ribbon-content::after {
	right: 0;
	border-width: 1em 1em 0 0;
}
</style>
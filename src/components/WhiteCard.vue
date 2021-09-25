<template>
	<div class="whiteCard-wrapper" :class="{ 'trashable': isTrashable, 'trashMode': trashMode }">
		
		<button class="btn-trash" v-if="isTrashable" @click="trashCard"><ion-icon name="trash"></ion-icon></button>
		
		<div class="whiteCard" ref="card" :class=classList @click="onClick">	
			<div class="card-text" v-if="!facedown && !isBlank">{{ this.text }}</div>
			
			<textarea class="blank-input" v-if="isBlank" v-model="blanktext" placeholder="Blank Card" maxlength="60" @blur="onBlur" />
			<span class="char-limit" v-if="isBlank && editing && blanktext.length > 30">{{blanktext.length}}/60</span>
			<transition name="save-btn">
				<button class="btn-save" v-if="isBlank && editing" @click="submitBlankCard"><ion-icon name="checkmark" /></button>
			</transition>
			
			<div class="ribbon" v-if="this.isWinner">
				<div class="ribbon-content">
					<small>Played by</small>
					{{ this.$store.state.room.turn.winningCard.playedBy }}
				</div>
			</div>

		</div>
	</div>
</template>

<script>
import '@interactjs/auto-start'
import '@interactjs/actions/drag'
import interact from '@interactjs/interact';

export default {
	name: 'WhiteCard',
	props: {
		text: String,
		facedown: Boolean,
		index: Number
	},
	data() {
		return {
			blanktext_: '',
			editing: false,
			disableClicks: false,
			isDragging: false,
			trashMode: false // true = keep card rotated to access trash button
		}
	},
	computed: {
		classList() {
			return {
				facedown: this.facedown,
				winner: this.isWinner,
				blank: this.isBlank
			}
		},
		blanktext: {
			get() {
				return this.blanktext_;
			},
			set(value) {
				this.blanktext_ = value.substring(0, 60);
			}
		},
		isBlank() {
			return this.text.startsWith('%BLANK%');
		},
		isWinner() {
			if (this.$store.state.room.turn.winningCard !== null) {
				return this.$store.state.room.turn.winningCard.text === this.text;
			} else return false;
		},
		isTrashable() {
			// Only non-blank cards that are in our hand are trashable
			return !this.isBlank && !this.$store.state.user.playedThisTurn && !this.$store.getters['user/isCzar'];
		}
	},
	methods: {
		onClick(mouseEvent) {
			if (this.text == null || this.facedown) return;
			if (this.isDragging) return;

			if (this.trashMode) { // Click card to get out of trash mode
				this.trashMode = false;
				return;
			}

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
		},
		trashCard() {
			this.$store.dispatch('user/trashCard', this.text);
			this.trashMode = false;
		}
	},
	mounted() {
		// Peek trash mode on round 1 so people know it's there.
		// Wait 4s for the interstitial to finish
		if (this.isTrashable && this.index === 0 && this.$store.state.room.turn.round === 1) {
			window.setTimeout(() => {
				this.trashMode = true;
				window.setTimeout(() => this.trashMode = false, 600);
			}, 4000);
		}

		interact(this.$refs.card).draggable({
			startAxis: 'x', // Only worry about it if the drag was horizontal
			onstart: (event) => {
				if (this.isTrashable) {
					this.isDragging = true;
					this.trashMode = event.velocityX > 0;
				}
			},
			onend: () => {
				// Wait 1ms to disable drag mode, so our click handler knows we were just dragging
				window.setTimeout(() => {
					this.isDragging = false
				}, 1);
			}
		}).styleCursor(false);
	},
	beforeDestroy() {
		interact(this.$refs.card).unset();
	}
}
</script>

<style>
.whiteCard-wrapper {
	position: relative;
	max-width: 150px;
	min-width: 120px;
	height: 195px;
	border-radius: 15px;
}
.whiteCard-wrapper.trashable {
	background: rgba(177, 177, 177, 0.25);
}
.whiteCard {
	position: relative;
	display: inline-block;

	/* OG size: 200 x 260 */
	width: 100%;
	height: 100%;
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

.trashMode .whiteCard {
	/* Use matrix here rather than rotate() because needing to set transform-origin leads to issues
	with all sorts of other transforms (i.e. :hover, .facedown). Note: 7.5deg rotate with origin 70% 200% looked good */
	transform: matrix(1, 0.2, -0.2, 1, 35, 5); 
	z-index: 1201;
}
.trashMode .btn-trash {
	transform: none;
}

.btn-trash {
	position: absolute;
	top: 5px;
	left: 8px;

	--size: 35px;
	width: var(--size);
	height: var(--size);
	padding: 0;
	margin: 0;
	
	border-radius: 100%;
	border-color: var(--gray-300);
	background-color: transparent;

	color: var(--gray-300);

	transform: translateX(20px) rotate(70deg); /* This gets set to none in trashMode */
	transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.btn-trash:hover {
	background-color: var(--accent-300);
	border-color: var(--accent-300);
	color: #fff;
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
	letter-spacing: 0;
	font-size: 1.7em; /* Nanum Pen Script is smaller than Aktiv Grotesk, this comps for that. Calculation was done by eye, so not perfect. */
}
.blank-input {
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
.blank-input:focus {
	outline: none;
}
.blank-input::placeholder,
.blank-input::-webkit-input-placeholder,
.blank-input::-moz-placeholder {
	position: relative; /* ??? This should be absolute but doesn't work on mobile */

	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);

	font-family: aktiv-grotesk, Helvetica, sans-serif;
	font-size: clamp(1rem, 5.2vw, 1.25rem);
	text-align: center;
	color: var(--gray-200);
	white-space: pre-wrap;
}

.whiteCard.blank .char-limit {
	position: absolute;
	bottom: 5px;
	left: 5px;
	color: var(--gray-200);
	font-size: 1.2rem;
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
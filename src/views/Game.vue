<template>
	<div id="game">
		<question-card :text="questionText" />

		<info-bar :text=infoText v-if=infoText />

		<transition-group id="cardContainer" tag="div" name="cards">
			<white-card v-for="(card, index) in cardSet"
				:key='card.text || card'
				:class="{'blankfont': card.blank}"
				:style="{'--delay': index*0.3+'s'}"
				:index=index
				:text='card.text || card'
				:facedown="(playedThisTurn || isCzar) && turnStatus === 'WAITING_FOR_CARDS'" />
		</transition-group>
	</div>
</template>

<script>
import InfoBar from '@/components/InfoBar';
import QuestionCard from '@/components/QuestionCard';
import WhiteCard from '@/components/WhiteCard';
import { mapState, mapGetters } from 'vuex';

export default {
	name: 'Game',
	components: {
		InfoBar,
		QuestionCard,
		WhiteCard,
	},
	computed: {
		infoText() {
			if (this.isCzar) {
				return this.turnStatus === 'WAITING_FOR_CZAR' ? 'Select the winning card!' : 'You are the Card Czar!'
			}
			else if (this.playedThisTurn) {
				if (this.turnStatus === 'WAITING_FOR_CARDS') return 'Waiting for everyone to play a card!'
				if (this.turnStatus === 'WAITING_FOR_CZAR') return `Waiting for ${this.czar} to pick a winner...`
			}
			
			return false;
		},
		cardSet() {
			if (this.$store.state.room.turn.winningCard) return [this.$store.state.room.turn.winningCard]
			if (this.isCzar || this.playedThisTurn) return this.playedCards
			if (!this.isCzar && !this.playedThisTurn) return this.hand
			return null;
		},
		...mapState('room', {
			questionText: state => state.turn.questionCard,
			turnStatus: state => state.turn.status,
			playedCards: state => state.turn.playedCards,
			czar: state => state.turn.czar
		}),
		...mapState('user', [
			'playedThisTurn',
			'hand'
		]),
		...mapGetters('user', [
			'isCzar'
		])
	}
}
</script>

<style>
#game {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
  flex-direction: column;
  align-items: center;

	width: 100%;
	padding: 0 5vw;
	box-sizing: border-box;

	scroll-behavior: smooth;
  color: inherit;
}
#cardContainer {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(auto-fit, min(150px, 48%)); /* 150 = width of white card */
	gap: 10px;
	padding: 10px;
	/* Mainly to leave room so the status bar doesn't cover up our cards */
	margin-bottom: 70px;

	justify-content: center;

	perspective: 800px;
	
	overflow-y: scroll;
	overflow-x: hidden; /* Without this, there's issues when a card rotates for trash mode causing the container to expand */
	
	z-index: 1200;
}

/* Animation */
/* <transition-group> doesn't have a mode prop like <transtion> does,
 * so we add the 0.3s buffer to let the other cards get fully removed
 * before we come in 
 * Also note to self I haven't seen anyone else doing staggered animations
 * with css variables like this online but I didn't look too hard */
.cards-enter-active {
	transition: opacity calc(0.3s + var(--delay));
}
.cards-enter, .cards-leave-to {
  opacity: 0;
}
.whiteCard.cards-move {
	transition: all 0s;
}
</style>
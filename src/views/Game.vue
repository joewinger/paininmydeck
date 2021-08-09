<template>
	<div id="game">
		<question-card :text="questionText" />

		<info-bar :text=infoText v-if=infoText />

		<div id="cardContainer">
			<white-card v-for="card in cardSet"
				:key='card.text || card'
				:text='card.text || card'
				:facedown="playedThisTurn && turnStatus === 'WAITING_FOR_CARDS'" />
		</div>

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
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
}
#cardContainer {
	width: 90vw;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, auto)); /* 150 = width of white card */
	gap: 10px;
	padding: 10px;

	justify-items: center;

	perspective: 800px;
	
	overflow-y: scroll;
	overflow-x: visible;
}
</style>
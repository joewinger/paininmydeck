<template>
	<div id="game">
		<question-card :text="questionText" />

		<info-bar :text=infoText v-if=infoText />


		<!-- <div id="cardArea">
			<white-card v-for="(card, index) in playedCards"
				:key=index
				:text=card.text
				:facedown="turnStatus === 'WAITING_FOR_CARDS'" />
		</div> -->

		<div id="playedCardsContainer" v-if="isCzar || playedThisTurn">
			<white-card v-for="(card, index) in playedCards"
				:key=index
				:text=card.text
				:facedown="turnStatus === 'WAITING_FOR_CARDS'" />
		</div>

		<hand v-if="!isCzar && !playedThisTurn" :cards="hand" />
	</div>
</template>

<script>
import InfoBar from '@/components/InfoBar';
import QuestionCard from '@/components/QuestionCard';
import WhiteCard from '@/components/WhiteCard';
import Hand from '@/components/Hand';
import { mapState, mapGetters } from 'vuex';

export default {
	name: 'Game',
	components: {
		InfoBar,
		QuestionCard,
		WhiteCard,
		Hand
	},
	computed: {
		infoText() {
			if (this.isCzar) {
				return this.turnStatus === 'WAITING_FOR_CZAR' ? 'Select the winning card!' : 'You are the Card Czar!'
			}
			else if (this.playedThisTurn) {
				if(this.turnStatus === 'WAITING_FOR_CARDS') return 'Waiting for everyone to play a card!'
				if(this.turnStatus === 'WAITING_FOR_CZAR') return `Waiting for ${this.czar} to pick a winner...`
			}
			
			return false;
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
#playedCardsContainer {
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
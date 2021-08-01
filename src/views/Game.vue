<template>
	<div id="game">
		<QuestionCard :text="questionText"></QuestionCard>

		<InfoBar text="You are the Card Czar!" v-if="isCzar"></InfoBar>
		<InfoBar text="Waiting for everyone to play a card..." v-if="playedThisTurn && turnStatus === 'WAITING_FOR_CARDS'" ></InfoBar>
		<InfoBar :text="`Waiting for ${czar} to pick a winner...`" v-if="playedThisTurn && turnStatus === 'WAITING_FOR_CZAR'"></InfoBar>

		<div id="playedCardsContainer" v-if="isCzar || playedThisTurn">
			<WhiteCard v-for="(card, index) in playedCards"
				:key=index
				:text=card.text
				:facedown="turnStatus === 'WAITING_FOR_CARDS'" />
		</div>

		<Hand v-if="!isCzar && !playedThisTurn" :cards="hand"></Hand>
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
		...mapGetters('user', {
			isCzar: 'isCzar'
		})
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
	height: auto;
	grid-template-columns: repeat(auto-fill, minmax(150px, auto)); /* 150 = width of white card */
	gap: 10px;

	justify-items: center;

	perspective: 800px;
	
	overflow-y: scroll;
}
</style>
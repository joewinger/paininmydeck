<template>
	<div id="game">
		<QuestionCard :text="this.$store.state.room.turn.questionCard"></QuestionCard>

		<InfoBar text="You are the Card Czar!" v-if="$store.getters['user/isCzar']"></InfoBar>
		<InfoBar text="Waiting for everyone to play a card..." v-if="this.$store.state.user.playedThisTurn && this.$store.state.room.turn.status === 'WAITING_FOR_CARDS'" ></InfoBar>
		<InfoBar :text="`Waiting for ${this.$store.state.room.turn.czar} to pick a winner...`" v-if="this.$store.state.user.playedThisTurn && this.$store.state.room.turn.status === 'WAITING_FOR_CZAR'"></InfoBar>

		<div id="playedCardsContainer" v-if="$store.getters['user/isCzar'] || this.$store.state.user.playedThisTurn">
			<WhiteCard v-for="(card, index) in this.$store.state.room.turn.playedCards"
				:key=index
				:text=card.text
				:facedown="$store.state.room.turn.status === 'WAITING_FOR_CARDS'" />
		</div>

		<Hand v-if="!this.$store.getters['user/isCzar'] && !this.$store.state.user.playedThisTurn" :cards="this.$store.state.user.hand"></Hand>
	</div>
</template>

<script>
import InfoBar from '@/components/InfoBar';
import QuestionCard from '@/components/QuestionCard';
import WhiteCard from '@/components/WhiteCard';
import Hand from '@/components/Hand';

export default {
	name: 'Game',
	components: {
		InfoBar,
		QuestionCard,
		WhiteCard,
		Hand
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
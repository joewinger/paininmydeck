<template>
	<div id="game">
		<FriendBar></FriendBar>

		<QuestionCard :text="this.$store.state.room.currentBlackCard"></QuestionCard>

		<div v-if="$store.getters['user/isCzar']">
			<InfoBar text="You are the Card Czar!"></InfoBar>
			<div id="activeCardsContainer">
				<WhiteCard v-for="(card, index) in this.$store.state.room.activeCards"
					:key=index
					:text=card.text
					:facedown="$store.state.room.turnStatus == 'WAITING_FOR_CARDS'"></WhiteCard>
					<!--  -->
			</div>
		</div>

		<div v-if="this.$store.state.user.playedThisTurn">
			<InfoBar v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CARDS'" text="Waiting for everyone to play a card..."></InfoBar>
			<InfoBar v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CZAR'" :text="`Waiting for ${this.$store.state.room.currentCzar} to pick a winner...`"></InfoBar>
			
			<div id="activeCardsContainer">
				<WhiteCard v-for="(card, index) in this.$store.state.room.activeCards"
					:key=index
					:text=card.text
					:facedown="$store.state.room.turnStatus == 'WAITING_FOR_CARDS'"></WhiteCard>
			</div>
		</div>

		<Hand v-if="!this.$store.getters['user/isCzar'] && !this.$store.state.user.playedThisTurn" :cards="this.$store.state.user.hand"></Hand>

		<StatusMenu></StatusMenu>
	</div>
</template>

<script>
import FriendBar from '@/components/FriendBar';
import InfoBar from '@/components/InfoBar';
import QuestionCard from '@/components/QuestionCard';
import WhiteCard from '@/components/WhiteCard';
import Hand from '@/components/Hand';
import StatusMenu from '@/components/StatusMenu';

export default {
	name: 'Game',
	components: {
		FriendBar,
		InfoBar,
		QuestionCard,
		WhiteCard,
		Hand,
		StatusMenu
	}
}
</script>

<style>
#activeCardsContainer {
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
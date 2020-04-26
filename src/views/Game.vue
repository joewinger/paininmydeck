<template>
	<div id="game">
		<FriendBar></FriendBar>

		<QuestionCard :text="this.$store.state.room.currentBlackCard"></QuestionCard>

		<div v-if="this.$store.getters['user/isCzar']">
			<br>
			<b><i>You are the Card Czar!</i></b>
			<br>
			<span v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CARDS'">Waiting for everyone to pick a card... ({{this.$store.state.room.activeCards.length}}/{{this.$store.state.room.users.length-1}})</span>
		</div>

		<div v-if="this.$store.state.user.playedThisTurn">
			<br>
			<span v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CARDS'">Waiting for everyone to play a card... ({{this.$store.state.room.activeCards.length}}/{{this.$store.state.room.users.length-1}})</span>
			<span v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CZAR'">Waiting for {{this.$store.state.room.currentCzar}} to pick a winner...</span>
		</div>
		
		<Hand v-if="!this.$store.getters['user/isCzar'] && !this.$store.state.user.playedThisTurn" :cards="this.$store.state.user.hand"></Hand>

		<ul v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CZAR'">
			<li v-for="card in this.$store.state.room.activeCards" :key="card.text">
				<WhiteCard :text="card.text"></WhiteCard>
			</li>
		</ul>
	</div>
</template>

<script>
import FriendBar from '@/components/FriendBar.vue';
import QuestionCard from '@/components/QuestionCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import Hand from '@/components/Hand.vue';

export default {
	name: 'Game',
	components: {
		FriendBar,
		QuestionCard,
		WhiteCard,
		Hand
	}
}
</script>
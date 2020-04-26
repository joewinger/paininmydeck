<template>
	<div id="game">
		<h1>Room {{this.$store.state.room.roomId}}</h1>
		<span>Points: {{this.$store.state.user.points}}</span>
		<br>

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
import QuestionCard from '@/components/QuestionCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import Hand from '@/components/Hand.vue';

export default {
	name: 'Game',
	components: {
		QuestionCard,
		WhiteCard,
		Hand
	}
}
</script>
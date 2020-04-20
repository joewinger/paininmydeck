<template>
	<div id="game">
		<h1>Room {{this.$root.$data.roomData.roomId}}</h1>
		<span>Points: {{this.$root.$data.userData.points}}</span>
		<br>

		<BlackCard :text="this.$root.$data.roomData.currentBlackCard"></BlackCard>

		<div v-if="this.$root.$data.userData.isCzar">
			<br>
			<b><i>You are the Card Czar!</i></b>
			<br>
			<span v-if="this.$root.$data.roomData.turnStatus == 'WAITING_FOR_CARDS'">Waiting for everyone to pick a card... ({{this.$root.$data.roomData.activeCards.length}}/{{this.$root.$data.roomData.users.length-1}})</span>
		</div>

		<div v-if="this.$root.$data.userData.playedThisTurn">
			<br>
			<span v-if="this.$root.$data.roomData.turnStatus == 'WAITING_FOR_CARDS'">Waiting for everyone to play a card... ({{this.$root.$data.roomData.activeCards.length}}/{{this.$root.$data.roomData.users.length-1}})</span>
			<span v-if="this.$root.$data.roomData.turnStatus == 'WAITING_FOR_CZAR'">Waiting for the Czar to pick a winner...</span>
		</div>
		
		<Hand v-if="!this.$root.$data.userData.isCzar && !this.$root.$data.userData.playedThisTurn" :cards="this.$root.$data.userData.hand"></Hand>

		<ul v-if="this.$root.$data.roomData.turnStatus == 'WAITING_FOR_CZAR'">
			<li v-for="card in this.$root.$data.roomData.activeCards" :key="card.text">
				<WhiteCard :text="card.text"></WhiteCard>
			</li>
		</ul>
	</div>
</template>

<script>
import BlackCard from '@/components/BlackCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import Hand from '@/components/Hand.vue';

export default {
	name: 'Game',
	components: {
		BlackCard,
		WhiteCard,
		Hand
	}
}
</script>
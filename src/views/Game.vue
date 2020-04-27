<template>
	<div id="game">
		<FriendBar></FriendBar>

		<QuestionCard :text="this.$store.state.room.currentBlackCard"></QuestionCard>

		<InfoBar v-if="this.$store.getters['user/isCzar']" text="You are the Card Czar!"></InfoBar>

		<div v-if="this.$store.state.user.playedThisTurn">
			<InfoBar v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CARDS'" text="Waiting for everyone to play a card..."></InfoBar>
			<InfoBar v-if="this.$store.state.room.turnStatus == 'WAITING_FOR_CZAR'" :text="`Waiting for ${this.$store.state.room.currentCzar} to pick a winner...`"></InfoBar>
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
import InfoBar from '@/components/InfoBar.vue';
import QuestionCard from '@/components/QuestionCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import Hand from '@/components/Hand.vue';

export default {
	name: 'Game',
	components: {
		FriendBar,
		InfoBar,
		QuestionCard,
		WhiteCard,
		Hand
	}
}
</script>
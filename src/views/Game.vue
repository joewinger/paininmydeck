<template>
	<div id="game">
		<question-card :text="questionText" />

		<info-bar :text=infoText v-if=infoText />

		<transition-group id="card-container" tag="div" name="cards">
			<white-card v-for="(card, index) in cardSet"
				:key="card.id"
				:style="{'--delay': index*0.3+'s'}"
				:index="index"
				:card="card"
				:facedown="(game.playedThisTurn || game.isCzar) && game.phase === 'COLLECTING'" />
		</transition-group>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import InfoBar from '@/components/InfoBar.vue';
import QuestionCard from '@/components/QuestionCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import { useGameStore } from '@/stores/game';
import type { Card, PlayedCard } from '@/shared/protocol';

const game = useGameStore();
const questionText = computed(() => game.turn.questionCard);
const czarName = computed(() => game.czar?.displayName ?? 'the Czar');
const infoText = computed(() => {
	if (game.connectionState === 'connecting') return 'Connecting to the room...';
	if (game.connectionState === 'reconnecting') return 'Reconnecting to the room...';
	const disconnected = game.users.filter((player) => !player.connected).map((player) => player.displayName);
	if (disconnected.length === 1) return `Waiting for ${disconnected[0]} to reconnect...`;
	if (disconnected.length > 1) return `Waiting for ${disconnected.join(', ')} to reconnect...`;
	if (game.isCzar) return game.phase === 'JUDGING' || game.phase === 'REVEAL' ? 'Select the winning card!' : 'You are the Card Czar!';
	if (game.playedThisTurn) {
		if (game.phase === 'COLLECTING') return 'Waiting for everyone to play a card!';
		if (game.phase === 'JUDGING' || game.phase === 'REVEAL') return `Waiting for ${czarName.value} to pick a winner...`;
	}
	return '';
});
const cardSet = computed<(Card | PlayedCard)[]>(() => {
	if (game.turn.winningCard) return [game.turn.winningCard];
	if (game.isCzar || game.playedThisTurn) return game.turn.playedCards;
	return game.hand;
});

onBeforeRouteLeave((to) => {
	if (to.name !== 'home' || game.beingKicked || game.terminalExit !== null) return true;
	return window.confirm("Are you sure you'd like to leave in the middle of this game?");
});
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
#card-container {
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
.cards-enter-from, .cards-leave-to {
  opacity: 0;
}
.whiteCard.cards-move {
	transition: all 0s;
}
</style>

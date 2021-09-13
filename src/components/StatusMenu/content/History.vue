<template>
	<div id="statusMenuContent-history" class="statusMenuContent">
		<h1>Round History</h1>
		<div v-for="round in this.$store.state.room.roundHistory.slice(1)" class="round" :key="round.round">
			<h4 class="question">{{ round.question | blankify }}</h4>
			<ol class="answers">
				<li class="miniCard winningAnswer" :style="{'--playedBy': `'${round.winningPlayer}'`}">{{ round.winningAnswer }}</li>
				<li class="miniCard" v-for="answer in round.otherAnswers" :key="answer.text"  :style="{'--playedBy': `'${answer.playedBy}'`}">{{ answer.text }}</li>
			</ol>
		</div>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentHistory'
}
</script>

<style>
#statusMenuContent-history {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	flex-direction: column;

	height: 55vh;
	overflow-y: auto;
}

/* .round {
	border-top : var(--ui-border-width) dotted var(--gray-200);
} */

.round .question {
	font-weight: 600;
	margin-top: 20px;
	margin-bottom: 5px;
}

ol.answers {
	display: flex;
	justify-content: flex-start;
	align-items: flex-start;
	flex-direction: row;
	gap: 5px;

	width: 278px;
	padding: 0;
	margin: 8px 0;

	overflow-x: auto;

	list-style: none;

	scroll-snap-type: x proximity;
}

.miniCard {
	position: relative;
	min-width: 75px;
	max-width: 75px;
	height: 105px;
	padding: 7.5px;
	margin-right: 20px;

	border: var(--ui-border-width) solid var(--gray-200);
	box-shadow: 0px 4px 4px rgba(177, 177, 177, 0.25);
	border-radius: 10px;

	color: var(--gray-500);
  font-family: aktiv-grotesk, Helvetica, sans-serif;
	/* font-weight: bold; */
	font-size: 0.9em;

	scroll-snap-align: start;
}
.miniCard::after {
	content: var(--playedBy);
	position: absolute;
	right: -20px;
	top: 5px;
	writing-mode: vertical-rl;
	text-orientation: mixed;
	color: var(--gray-300);
}
.miniCard.winningAnswer {
	border-color: var(--primary-200);
}
</style>
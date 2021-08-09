<template>
	<div class="whiteCard" :class="{facedown: this.facedown, winner: this.isWinner }" @click="onClick">
		<div class="card-text" v-if="!facedown">{{ this.text }}</div>
		<div class="winner-credit" v-if="this.isWinner">
			Played by: {{this.$store.state.room.turn.winningCard.playedBy}}
		</div>
	</div>
</template>

<script>
export default {
	name: 'WhiteCard',
	props: {
		text: String,
		facedown: Boolean
	},
	methods: {
		onClick() {
			if(this.text == null || this.facedown) return;

			if(this.$store.getters['user/isCzar']) {
				this.$game.chooseCard(this.text);
			} else {
				if(this.$store.state.user.playedThisTurn) return;

				this.$game.playCard(this.text);
			}
		}
	},
	computed: {
		isWinner() {
			if(this.$store.state.room.turn.winningCard !== null) {
				return this.$store.state.room.turn.winningCard.text === this.text;
			} else return false;
		}
	}
}
</script>

<style scoped>
.whiteCard {
	position: relative;
	display: inline-block;

	/* width: 200px;
	height: 260px; */
	width: 150px;
	height: 195px;
	padding: 15px;

	background: #fff;
	border-radius: 15px;
	border: var(--ui-border-width) solid var(--gray-200);
	box-shadow: 0px 4px 4px rgba(177, 177, 177, 0.25);

	color: var(--gray-500);
  font-family: aktiv-grotesk, Helvetica, sans-serif;
	text-align: left;
	font-size: 1.25rem;
	font-weight: bold;

	cursor: pointer;
	transition: transform 0.3s;
	transform-style: preserve-3d;
	-webkit-transform-style: preserve-3d;

	z-index: 1200;
}
.whiteCard .card-text {
	backface-visibility: hidden;
}

.whiteCard.facedown {
  transform: rotateY( 180deg );
}

.winner {
	transform: scale(1.1);
}

.winner-credit {
	position: absolute;
	color: #828282;

	left: 15px;
	bottom: 15px;

	font-size: 0.9em;
}
</style>
<template>
	<div class="whiteCard" :class="{ winner: (this.$store.state.room.turnWinningCard != null) ? this.$store.state.room.turnWinningCard.text == this.text : false }" @click.once="playCard">
		<div class="front">
			{{ this.text }}
		</div>

		<div class="back" v-if="(this.$store.state.room.turnWinningCard != null) ? this.$store.state.room.turnWinningCard.text == this.text : false">	
			{{ this.$store.state.room.turnWinningCard.playedBy }} wins this turn!
		</div>	
	</div>
</template>

<script>
import dbManager from '../dbManager'

export default {
	name: 'WhiteCard',
	props: {
		text: String
	},
	methods: {
		playCard() {
			if(this.text == null) return;

			if(this.$store.getters['user/isCzar']) {
				dbManager.chooseCard(this.text);
			} else {
				if(this.$store.state.user.playedThisTurn) return;

				dbManager.playCard(this.text);
				this.$store.commit('user/setPlayedThisTurn', true);
			}
		}
	}
}
</script>

<style scoped>
.whiteCard {
	position: relative;
	display: inline-block;

	width: 200px;
	height: 200px;
	padding: 15px;

	background: #fff;
	border-radius: 15px;
	box-shadow: #555 0px 0px 5px;

	color: #000;
	text-align: left;
	font-size: 16pt;
	font-weight: bold;

	cursor: pointer;

  transition: transform 0.6s;
	transform-style: preserve-3d;
}

.whiteCard.winner {
	transform: rotateY(180deg);
}

.front, .back {
  -webkit-backface-visibility: hidden;
	backface-visibility: hidden;
	-webkit-font-smoothing: antialiased;
}

.front {
	background: #fff;
}

.back {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;

	width: 100%;
	height: 100%;
	
	border-radius: 15px;

	transform: rotateY(180deg);
}
</style>
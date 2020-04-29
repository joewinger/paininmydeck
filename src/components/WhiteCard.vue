<template>
	<div class="whiteCard" @click.once="playCard">
		{{ this.text }}
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

	/* width: 200px;
	height: 260px; */
	width: 150px;
	height: 195px;
	padding: 15px;
	margin-left: 10px;

	background: #fff;
	border-radius: 15px;
	border: 2px solid #E0E0E0;
	box-shadow: 0px 4px 4px rgba(177, 177, 177, 0.25);

	color: #000;
	text-align: left;
	/* font-size: 16pt; */
	font-size: 13pt;
	font-weight: bold;

	cursor: pointer;

  transition: transform 0.6s;
	transform-style: preserve-3d;
}
</style>
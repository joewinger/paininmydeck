<template>
  <div id="gameover">
		<h1>{{ roomData.winner.username }} won!</h1>
		<p id="final-rounds">&mdash; The game lasted {{ roomData.rounds }} rounds &mdash;</p>
		<ol id="final-leaderboard">
			<li class="final-leaderboard_player" v-for="(player, index) in roomData.leaderboard" :key="player.username">
				<div class="rank">{{ index+1 }}<sup>{{ getOrdinalSuffix(index+1) }}</sup></div>
				<div class="username">{{ player.username }}</div>
				<div class="points">{{ player.points }}pts</div>
			</li>
		</ol>
    <button @click="$router.replace('/')">Leave Game</button>
  </div>
</template>

<script>
export default {
	name: 'GameOver',
	data() {
		return {
			roomData: {}
		}
	},
	methods: {
		getOrdinalSuffix(number) {
			switch(number) {
				case 1:
					return 'st';
				case 2:
					return 'nd';
				case 3:
					return 'rd';
				default:
					return 'th';
			}
		}
	},
	async mounted() {
		this.roomData = await this.$game.getFinalRecordData();
	}
}
</script>

<style>
#gameover {
	display: flex;
	justify-content: flex-start;
	align-items: center;
	flex-direction: column;
}
#gameover h1 {
	margin: 50px 0 5px 0;
}

#final-rounds {
	margin: 0 0 10px 0;
	font-size: 1.1rem;
	font-style: italic;
}

#final-leaderboard {
	display: grid;
	grid-template-areas:
										'silver gold bronze'
										'd d d';
	grid-template-columns: 1fr 1fr 1fr;
	grid-template-rows: 150px repeat(auto-fit, 50px);
	align-items: end;
	gap: 10px;

	width: min(90vw, 400px);
	padding: 0;
	margin-top: 50px;

	list-style: none;
}

.final-leaderboard_player {
	display: flex;
	justify-content: space-between;

	height: 50px;
	width: 100%;
	box-sizing: border-box;

  background-origin: border-box;
	border-radius: 8px;

	font-size: 1.1rem;
	font-weight: 600;
	grid-column: 1/-1;
}
.final-leaderboard_player:nth-last-child(2n-1) {
	background-color: var(--gray-100);
}
.final-leaderboard_player > div {
	margin: auto 0;
}
.final-leaderboard_player > .rank,
.final-leaderboard_player > .points {
	text-align: center;
}
.final-leaderboard_player > .rank {
	width: 50px;

	opacity: 0.8;

  color: hsl(0, 0%, 100%);
	font-size: 1.9rem;
	font-weight: 800;
  text-shadow:
    1px  1px var(--gray-400),
    -1px -1px var(--gray-400),
    -1px  1px var(--gray-400),
    1px -1px var(--gray-400);
}
.final-leaderboard_player > .rank > sup {
	top: -10px;
	left: 1px;

	font-size: 0.55em;
}
.final-leaderboard_player > .points {
	width: 80px;

	font-size: 0.9em;
}

.final-leaderboard_player:nth-of-type(1),
.final-leaderboard_player:nth-of-type(2),
.final-leaderboard_player:nth-of-type(3) {
	position: relative;
	flex-direction: column;
	align-items: center;

	border: solid 3px var(--border-color);
  background-origin: border-box;
	box-shadow:
		0 1px var(--border-color),
		0 1.5px var(--border-color),
		0 2px var(--border-color),
		0 2.5px var(--border-color),
		0 3px var(--border-color),
		0 3.5px var(--border-color),
		0 4px 10px var(--border-color);
}
.final-leaderboard_player:nth-of-type(1) .username,
.final-leaderboard_player:nth-of-type(2) .username,
.final-leaderboard_player:nth-of-type(3) .username {
	position: absolute;
	top: -30px;
}
.final-leaderboard_player:nth-of-type(1) .rank,
.final-leaderboard_player:nth-of-type(2) .rank,
.final-leaderboard_player:nth-of-type(3) .rank {
	opacity: 1;

	font-size: 2em;
	text-shadow: 
		0px 1px var(--shadow-color),
		1px 2px var(--shadow-color),
		-1px 2px var(--shadow-color),
		0 5px 10px var(--shadow-color);
}
.final-leaderboard_player:nth-of-type(1) .points,
.final-leaderboard_player:nth-of-type(2) .points,
.final-leaderboard_player:nth-of-type(3) .points {
	height: 20px;
	margin: 0 0 5px 0;

	color: var(--points-color);
}
.final-leaderboard_player:nth-of-type(1) {
	grid-area: gold;

	height: 100%;

	background-color: hsl(49, 92%, 63%);
	--shadow-color: hsla(42, 80%, 40%, 80%);
	--points-color: hsla(42, 80%, 30%, 80%);
	--border-color: hsla(42, 80%, 40%, 20%);
}
.final-leaderboard_player:nth-of-type(2) {
	grid-area: silver;

	height: 75%;

	background-color: hsl(225, 20%, 82%);
	--shadow-color: hsla(222, 14%, 68%, 80%);
	--points-color: hsla(222, 12%, 40%, 80%);
	--border-color: hsla(222, 14%, 50%, 20%);
}
.final-leaderboard_player:nth-of-type(3) {
	grid-area: bronze;

	height: 60%;

	background-color: hsl(32, 55%, 56%);
	--shadow-color: hsla(31, 46%, 40%, 80%);
	--points-color: hsla(31, 46%, 30%, 80%);
	--border-color: hsla(31, 46%, 30%, 20%)
}
</style>

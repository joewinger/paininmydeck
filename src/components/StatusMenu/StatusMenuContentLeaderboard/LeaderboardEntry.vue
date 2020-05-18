<template>
	<div class="leaderboardEntry">
		<div class="leaderboardEntry-rank">
			{{ rank }}
		</div>
		<div class="leaderboardEntry-username">
			{{ userObj.username }}
		</div>
		<div class="leaderboardEntry-status">
			{{ status }}
		</div>
		<div class="leaderboardEntry-points">
			{{ userObj.points }}
		</div>
	</div>
</template>

<script>
const statusMessages = {
	czar: "Card czar",
	waiting: "Waiting to play a card...",
	played: "Played a card"
}

export default {
	name: 'LeaderboardEntry',
	props: {
		rank: Number,
		userObj: Object,
		playedCard: Boolean
	},
	computed: {
		status() {
			if(this.$store.state.room.turn.czar === this.userObj.username) {
				return statusMessages.czar
			}
			return this.playedCard ? statusMessages.played : statusMessages.waiting;
		}
	}
}
</script>

<style>
.leaderboardEntry {
	display: grid;
	grid-template-columns: 40px 1fr auto;
	gap: 2px;
	
	padding: 5px;

  border: solid 1px #E0E0E0;
	border-radius: 7px;

	-webkit-user-select: none;
     -moz-user-select: none;
			-ms-user-select: none;
					user-select: none;
}

.leaderboardEntry-rank {
	grid-column: 1;
	grid-row: 1 / span 2;

	display: flex;
	align-items: center;
	justify-content: center;

	font-size: 2rem;
	font-weight: bold;
  color: white;
  text-shadow:
    1px  1px 0 #777,
    -1px -1px 0 #777,
    -1px  1px 0 #777,
    1px -1px 0 #777;
}

.leaderboardEntry-username {
	grid-column: 2;
	grid-row: 1;

	font-weight: 700;
	text-align: left;
}

.leaderboardEntry-status {
	grid-column: 2;
	grid-row: 2;

	font-style: italic;
	font-size: 0.7em;
	text-align: left;
}

.leaderboardEntry-points {
	grid-column: 3;
	grid-row: 1 / span 2;

	padding: 0 5px;

	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
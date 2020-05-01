<template>
	<div id="statusMenuContent-settings">
		Settings
		<br>
		<label>Cards per hand:
			<input type="number" v-model.number="cardsPerHand" />
		</label>
		<label>Points to win:
			<input type="number" v-model.number="pointsToWin" />
		</label>
		<button @click=updateSettings>Save</button>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContent',
	computed: {
		cardsPerHand() {
			return this.$store.state.room.settings.cardsPerHand
		},
		pointsToWin() {
			return this.$store.state.room.settings.pointsToWin
		},
	},
	methods: {
		updateSettings() {
			const settingsObject = {
				cardsPerHand: this.cardsPerHand,
				pointsToWin: this.pointsToWin
			}

			this.$store.dispatch('room/updateSettings', settingsObject);
		}
	}
}
</script>

<style>
#statusMenuContent-settings {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	
	height: 200px;
}

#statusMenuContent-settings input {
	padding: 7px;
	margin: 0;
	height: auto;
	width: 20px;
	border-radius: 0;
	box-sizing: content-box;
}
</style>
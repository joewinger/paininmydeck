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
	data() {
		return { // -1 is the initial state, letting us know it has not been altered.
			changeCardsPerHand: -1,
			changePointsToWin: -1
		}
	},
	computed: {
		cardsPerHand: {
			get() {
				if(this.changeCardsPerHand === -1) return this.$store.state.room.settings.cardsPerHand;
				return this.changeCardsPerHand;
			},
			set(value) {
				this.changeCardsPerHand = value
			}
		},
		pointsToWin: {
			get() {
				if(this.changePointsToWin === -1) return this.$store.state.room.settings.pointsToWin;
				return this.changePointsToWin;
			},
			set(value) {
				this.changePointsToWin = value
			}
		},
	},
	methods: {
		updateSettings() {
			const settingsObject = {
				// Use the setting's state value if we haven't updated it ourselved
				cardsPerHand: (this.changeCardsPerHand !== -1) ? this.changeCardsPerHand : this.cardsPerHand,
				pointsToWin: (this.changePointsToWin !== -1) ? this.changePointsToWin : this.pointsToWin
			}

			console.log(settingsObject);

			this.$store.dispatch('room/updateSettings', settingsObject);

			this.changeCardsPerHand = -1;
			this.changePointsToWin = -1;
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
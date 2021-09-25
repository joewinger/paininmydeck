<template>
	<div id="statusMenuContent-settings" class="statusMenuContent">
		<h1>Settings</h1>
		<table>
			<tr>
				<td>Cards Per Hand</td>
				<td><input type="number" v-model.number="cardsPerHand" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>Points To Win</td>
				<td><input type="number" v-model.number="pointsToWin" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>Deck Blank Cards</td>
				<td><input type="number" v-model.number="numBlankCards" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>Guaranteed Blanks</td>
				<td><input type="number" v-model.number="guaranteedBlanks" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>All Blanks!</td>
				<td><input type="checkbox" v-model="allBlanks" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>Family Mode</td>
				<td><input type="checkbox" v-model="familyMode" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>Allowed Re-draws</td>
				<td><input type="number" v-model.number="numRedraws" :disabled="!canEdit" /></td>
			</tr>
			<tr>
				<td>Public Game</td>
				<td><input type="checkbox" v-model="publicGame" :disabled="!$store.state.user.isPrivileged" /></td>
			</tr>
		</table>
		<br>
		<button @click=updateSettings v-if="canEdit">Save</button>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContent',
	data() {
		return { // -1 is the initial state, letting us know it has not been altered.
			changeCardsPerHand: -1,
			changePointsToWin: -1,
			changeNumBlankCards: -1,
			changeGuaranteedBlanks: -1,
			changeNumRedraws: -1,
			allBlanks: this.$store.state.room.settings.allBlanks,
			familyMode: this.$store.state.room.settings.familyMode,
			publicGame: this.$store.state.room.settings.public
		}
	},
	computed: {
		canEdit() {
			return (!this.$store.state.room.settings.public) || this.$store.state.user.isPrivileged;
		},
		cardsPerHand: {
			get() {
				if (this.changeCardsPerHand === -1) return this.$store.state.room.settings.cardsPerHand;
				return this.changeCardsPerHand;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeCardsPerHand = this.clamp(value, 3, 30);
			}
		},
		pointsToWin: {
			get() {
				if (this.changePointsToWin === -1) return this.$store.state.room.settings.pointsToWin;
				return this.changePointsToWin;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changePointsToWin = this.clamp(value, 1, 100);
			}
		},
		numBlankCards: {
			get() {
				if (this.changeNumBlankCards === -1) return this.$store.state.room.settings.numBlankCards;
				return this.changeNumBlankCards;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeNumBlankCards = this.clamp(value, 0, 2000);
			}
		},
		guaranteedBlanks: {
			get() {
				if (this.changeGuaranteedBlanks === -1) return this.$store.state.room.settings.guaranteedBlanks;
				return this.changeGuaranteedBlanks;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeGuaranteedBlanks = this.clamp(value, 0, this.cardsPerHand);
			}
		},
		numRedraws: {
			get() {
				if (this.changeNumRedraws === -1) return this.$store.state.room.settings.numRedraws;
				return this.changeNumRedraws;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeNumRedraws = this.clamp(value, 0, 30);
			}
		},
	},
	methods: {
		clamp(value, min, max) {
			return Math.min(Math.max(value, min), max);
		},
		updateSettings() {
			const settingsObject = {
				// Use the setting's state value if we haven't updated it ourselved
				cardsPerHand: (this.changeCardsPerHand !== -1) ? this.changeCardsPerHand : this.cardsPerHand,
				pointsToWin: (this.changePointsToWin !== -1) ? this.changePointsToWin : this.pointsToWin,
				numBlankCards: (this.changeNumBlankCards !== -1) ? this.changeNumBlankCards : this.numBlankCards,
				guaranteedBlanks: (this.changeGuaranteedBlanks !== -1) ? this.changeGuaranteedBlanks : this.guaranteedBlanks,
				numRedraws: (this.changeNumRedraws !== -1) ? this.changeNumRedraws : this.numRedraws,
				allBlanks: this.allBlanks,
				familyMode: this.familyMode,
				public: this.publicGame
			}

			this.$store.dispatch('room/updateSettings', settingsObject);

			this.changeCardsPerHand = -1;
			this.changePointsToWin = -1;
			this.changeNumBlankCards = -1;
			this.changeGuaranteedBlanks = -1;
			this.changeNumRedraws = -1;

			this.$emit('close-menu');
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
}

#statusMenuContent-settings table tr td:nth-of-type(2) {
	width: 60px;
	text-align: center;
}

#statusMenuContent-settings input[type="number"] {
	padding: 7px;
	margin: 0;
	height: auto;
	width: 100%;
	border-radius: 0;
  -moz-appearance: textfield;
}
#statusMenuContent-settings input[type="number"]::-webkit-outer-spin-button,
#statusMenuContent-settings input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

#statusMenuContent-settings input[type="checkbox"] {
	margin: 7px 0;
	height: 20px;
	box-sizing: content-box;
}
</style>
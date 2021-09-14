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
		<!-- <div class="accordion">
			<div class="accordion-title" @click="toggleAccordion">
				<span>Deck Settings</span>
				<ion-icon name="chevron-back-circle-outline" class="accordion-toggle" ref="deckSettingsAccordianToggleButton"></ion-icon>
			</div>
			<div class="accordion-content" ref="deckSettingsAccordianContent">
				Coming soon
			</div>
		</div> -->
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
				this.changeCardsPerHand = value
			}
		},
		pointsToWin: {
			get() {
				if (this.changePointsToWin === -1) return this.$store.state.room.settings.pointsToWin;
				return this.changePointsToWin;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changePointsToWin = value
			}
		},
		numBlankCards: {
			get() {
				if (this.changeNumBlankCards === -1) return this.$store.state.room.settings.numBlankCards;
				return this.changeNumBlankCards;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeNumBlankCards = value;
			}
		},
		guaranteedBlanks: {
			get() {
				if (this.changeGuaranteedBlanks === -1) return this.$store.state.room.settings.guaranteedBlanks;
				return this.changeGuaranteedBlanks;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeGuaranteedBlanks = value;
			}
		},
		numRedraws: {
			get() {
				if (this.changeNumRedraws === -1) return this.$store.state.room.settings.numRedraws;
				return this.changeNumRedraws;
			},
			set(value) {
				if (!this.canEdit) return;
				this.changeNumRedraws = value;
			}
		},
	},
	methods: {
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
		},
		toggleAccordion() {
			const contentEl = this.$refs.deckSettingsAccordianContent;
			const toggle = this.$refs.deckSettingsAccordianToggleButton;
			if (contentEl.classList.contains('visible')) {
				contentEl.classList.remove('visible');
				toggle.classList.remove('open');
			}
			else {
				contentEl.classList.add('visible');
				toggle.classList.add('open');
			}
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

#statusMenuContent-settings input[type="number"] {
	padding: 7px;
	margin: 0;
	height: auto;
	width: 20px;
	border-radius: 0;
	box-sizing: content-box;
  -moz-appearance: textfield;
}
#statusMenuContent-settings input[type="number"]::-webkit-outer-spin-button,
#statusMenuContent-settings input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

#statusMenuContent-settings input[type="checkbox"] {
	margin: 7px;
	height: 20px;
	width: 20px;
	box-sizing: content-box;
}

.accordion {
	display: flex;
	flex-direction: column;
	width: 100%;
}
.accordion > .accordion-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: auto;
	padding-top: 5px;
	padding-bottom: 10px;
}
.accordion > .accordion-content {
	max-height: 0;
	overflow: hidden;
	transition: all 0.5s ease;
}
.accordion > .accordion-content.visible {
	max-height: 100px;
}
.accordion > .accordion-title > .accordion-toggle {
	transition: all 0.2s ease;
	font-size: 20pt;
}
.accordion > .accordion-title > .accordion-toggle.open {
	transform: rotateZ(-90deg);
}
.accordion > .accordion-content > h2 {
	font-size: 12pt;
}
</style>
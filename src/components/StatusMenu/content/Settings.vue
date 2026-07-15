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
		</table>
		<br>
		<button @click=updateSettings v-if="canEdit">Save</button>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import type { GameSettings } from '@/shared/protocol';

const emit = defineEmits<{ 'close-menu': [] }>();
const game = useGameStore();
const canEdit = computed(() => game.self !== null && game.phase === 'LOBBY');
const changedCardsPerHand = ref<number | null>(null);
const changedPointsToWin = ref<number | null>(null);
const changedNumBlankCards = ref<number | null>(null);
const changedGuaranteedBlanks = ref<number | null>(null);
const changedNumRedraws = ref<number | null>(null);
const changedAllBlanks = ref<boolean | null>(null);
const changedFamilyMode = ref<boolean | null>(null);

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(Number(value) || 0, min), max);
}

const cardsPerHand = computed<number>({
	get: () => changedCardsPerHand.value ?? game.settings.cardsPerHand,
	set: (value) => { changedCardsPerHand.value = clamp(value, 3, 30); },
});
const pointsToWin = computed<number>({
	get: () => changedPointsToWin.value ?? game.settings.pointsToWin,
	set: (value) => { changedPointsToWin.value = clamp(value, 1, 100); },
});
const numBlankCards = computed<number>({
	get: () => changedNumBlankCards.value ?? game.settings.numBlankCards,
	set: (value) => { changedNumBlankCards.value = clamp(value, 0, 2_000); },
});
const guaranteedBlanks = computed<number>({
	get: () => changedGuaranteedBlanks.value ?? game.settings.guaranteedBlanks,
	set: (value) => { changedGuaranteedBlanks.value = clamp(value, 0, cardsPerHand.value); },
});
const numRedraws = computed<number>({
	get: () => changedNumRedraws.value ?? game.settings.numRedraws,
	set: (value) => { changedNumRedraws.value = clamp(value, 0, 30); },
});
const allBlanks = computed<boolean>({
	get: () => changedAllBlanks.value ?? game.settings.allBlanks,
	set: (value) => { changedAllBlanks.value = value; },
});
const familyMode = computed<boolean>({
	get: () => changedFamilyMode.value ?? game.settings.familyMode,
	set: (value) => { changedFamilyMode.value = value; },
});

async function updateSettings() {
	if (!canEdit.value) return;
	const settings: GameSettings = {
		cardsPerHand: cardsPerHand.value,
		pointsToWin: pointsToWin.value,
		numBlankCards: numBlankCards.value,
		guaranteedBlanks: Math.min(guaranteedBlanks.value, cardsPerHand.value),
		numRedraws: numRedraws.value,
		allBlanks: allBlanks.value,
		familyMode: familyMode.value,
	};
	try {
		await game.updateSettings(settings);
		emit('close-menu');
	} catch {
		// The store reports command failures in the existing toast.
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

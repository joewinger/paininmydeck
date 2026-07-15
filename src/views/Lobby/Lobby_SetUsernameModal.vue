<template>
	<transition appear name="modal">
		<div id="modalWrapper">
			<div id="setUsernameModal">
				<h3>What should we call you?</h3>
				<input type="text" v-model="username" @keyup.enter="addUser" placeholder="Your username" maxlength="12" autofocus>
				<div id="colorSelector">
					<div
						v-for="colorSet in colorSets"
						:key="colorSet"
						@click="selectColor(colorSet)"
						:style="{ '--color': colorSet.split(',')[0] }"
						:class="{
							'swatch': true,
							'taken': game.usedColorSets.includes(colorSet),
							'selected': myColorSet === colorSet
						}">
					</div>
				</div>
				<button @click="addUser">Set Username</button>
			</div>
		</div>
	</transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';

const game = useGameStore();
const ui = useUiStore();
const username = ref(rememberedUsername());
const colorSets = [
	'#EE796E,#FAB4AD', '#F2A971,#FCD4B5', '#F4C876,#FDE6B9',
	'#ADD787,#CAEBAD', '#65C294,#96DFBB', '#5E87C5,#8FAFE0',
	'#5561AF,#808BD0', '#7E67AF,#A793D2', '#BE7CB5,#DEABD7',
];
const myColorSet = ref<string | null>(null);

function rememberedUsername(): string {
	try {
		const sessionName = sessionStorage.getItem('username');
		if (sessionName) return sessionName;
	} catch {
		// Storage is optional in hardened/private browser contexts.
	}
	try {
		return localStorage.getItem('username') ?? '';
	} catch {
		return '';
	}
}

function selectColor(colorSet: string) {
	if (!game.usedColorSets.includes(colorSet)) myColorSet.value = colorSet;
}

async function addUser() {
	const displayName = username.value.trim();
	if (!displayName) {
		ui.notify({ message: 'Username can not be blank!', title: 'Invalid Username' });
		return;
	}
	if (game.users.some((user) => user.displayName.toLocaleLowerCase() === displayName.toLocaleLowerCase())) {
		ui.notify({ message: `The username ${displayName} has already been taken!`, title: 'Invalid Username' });
		username.value = '';
		return;
	}
	if (displayName.length > 12) {
		ui.notify({ message: `The username ${displayName} is too long! 12 characters max, please :)`, title: 'Invalid Username' });
		return;
	}

	if (myColorSet.value === null) {
		const available = colorSets.filter((colorSet) => !game.usedColorSets.includes(colorSet));
		myColorSet.value = available[Math.floor(Math.random() * available.length)] ?? null;
	}
	if (!myColorSet.value) {
		ui.notify({ message: 'This room has no player colors left.', title: 'Room Full' });
		return;
	}
	const [from, to] = myColorSet.value.split(',');
	try {
		await game.setProfile(displayName, [from, to]);
	} catch {
		// The store reports profile failures and exits terminal provisional sessions.
	}
}
</script>

<style scoped>
#modalWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	position: fixed;
	z-index: 2500;
	top: 0;
	left: 0;
	backdrop-filter: blur(1.4px);

	width: 100vw;
	height: 100vh;

	background-color: #45474B64;
	
	-webkit-transition: opacity 0.3s ease;
	-moz-transition: opacity 0.3s ease;
	-ms-transition: opacity 0.3s ease;
	-o-transition: opacity 0.3s ease;
	transition: opacity 0.3s ease;
}
.slide-right-enter-active #modalWrapper, .slide-left-enter-active #modalWrapper {
	/* Without this, the modal is only drawn in the content row of our main grid during a route transition.
	This adjusts it so the spacing remains the same, stopping the modal from jumping when the transition stops. */
	margin-top: calc(var(--navbar-height) * -1);
}
#setUsernameModal {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-evenly;
	z-index: 2501;

	width: 300px;
	height: 250px;

	border-radius: 15px;
	border: 3px solid #E0E0E0;
	background: #FFFFFF;
	
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from #setUsernameModal,
.modal-leave-to #setUsernameModal {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}

#colorSelector {
	--swatchSize: 20px;
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
	gap: 5px;

	width: calc((var(--swatchSize) + 5px) * 5);
}
#colorSelector .swatch {
	display: flex;
	align-items: center;
	justify-content: center;

	width: var(--swatchSize);
	height: var(--swatchSize);

	background-color: var(--color);
	border: solid 0px var(--color);
	border-radius: 40%;
	cursor: pointer;
	transition: border-radius 0.3s, transform 0.3s, background-color 0.3s, border-color 0.3s;
}
#colorSelector .swatch.taken {
	position: relative;
	opacity: 0.3;
	cursor: default;
}
#colorSelector .swatch.taken::after {
	content: "";

	position: absolute;
	left: calc((var(--swatchSize) / 2 ) - 1px);
	
	width: 2px;
	height: calc(var(--swatchSize) * 1.5);
	
	transform: rotate(45deg);
	background-color: #ffffff;
}
#colorSelector .swatch.selected {
	background-color: transparent;
	border-radius: 100%;
	border-width: 6px;
	transform: scale(1.1)
}
</style>

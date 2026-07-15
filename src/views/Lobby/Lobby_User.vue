<template>
	<div class="lobbyUser" :style="{ '--color-from': user.colorSet[0], '--color-to': user.colorSet[1] }" :class="{ 'kickable': isKickable }" :title="title" @click="kickPlayer">
		{{ user.displayName }}
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const props = defineProps<{ user: PlayerSummary }>();
const game = useGameStore();
const isKickable = computed(() => game.isPrivileged && props.user.playerId !== game.self?.playerId);
const title = computed(() => isKickable.value ? `Kick ${props.user.displayName}` : '');

function kickPlayer() {
	if (isKickable.value) void game.kickPlayer(props.user.playerId).catch(() => undefined);
}
</script>

<style>
.lobbyUser {
	display: inline-flex;
	align-items: center;
	justify-content: center;

	height: 40px;
	padding: 0 25px;
	margin-top: 8px;
	
	border-radius: 20px;
	border: 3px solid #0E0E0E22;
  background-origin: border-box;
	background-image: linear-gradient(to right, var(--color-from) 0%, var(--color-to) 100%);

	color: #FFF;
	font-weight: 600;
}
.lobbyUser.kickable:hover {
	cursor: pointer;
}
</style>

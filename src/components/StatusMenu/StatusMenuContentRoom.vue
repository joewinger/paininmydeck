<template>
	<div id="statusMenuContent-room">
		<button @click="leaveRoom()">Leave Room</button>
	</div>
</template>

<script>
import dbManager from '@/dbManager.js';

export default {
	name: 'StatusMenuContentRoom',
	methods: {
		leaveRoom() {
			dbManager.leaveRoom();
		}
	}
}
</script>

<style>
#statusMenuContent-room {
	display: flex;
	align-items: center;
	justify-content: center;
	
	height: 200px;
}
</style>
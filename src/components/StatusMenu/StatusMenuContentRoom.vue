<template>
	<div id="statusMenuContent-room">
		<button @click="$router.replace('/')">Leave Room</button>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentRoom'
}
</script>

<style>
#statusMenuContent-room {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	
	height: 200px;
}
</style>
<template>
	<div id="statusMenuContent-info">
		<button @click="$router.replace('/')">Leave Room</button>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentInfo'
}
</script>

<style>
#statusMenuContent-info {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	
	height: 200px;
}
</style>
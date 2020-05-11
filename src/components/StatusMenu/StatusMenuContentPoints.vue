<template>
	<div id="statusMenuContent-points" class="statusMenuContent">
		<ol>
			<li v-for="user in $store.getters['room/sortedUsers']" :key="user.username">{{user.username}} - {{user.points}} points</li>
		</ol>
	</div>
</template>

<script>
export default {
	name: 'StatusMenuContentPoints'
}
</script>

<style>
#statusMenuContent-points {
	display: flex;
	align-items: center;
	justify-content: center;
	
	height: 200px;
}
</style>
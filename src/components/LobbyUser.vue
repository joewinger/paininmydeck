<template>
	<div class="lobbyUser" :style="`background-color: ${user.color}`">
		{{user.username}}
	</div>
</template>

<script>
export default {
	name: 'LobbyUser',
	props: {
		user: Object
	}
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

	color: #FFF;
	font-weight: 500;
	font-size: 18px;
}
</style>
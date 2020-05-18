<template>
	<div class="lobbyUser" :style="`background-image: linear-gradient(to right, ${user.colorSet[0]} 0%, ${user.colorSet[1]} 100%)`">
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
  background-origin: border-box;

	color: #FFF;
	font-weight: 500;
	font-size: 18px;
}
</style>
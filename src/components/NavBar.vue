<template>
	<div id="navbar">
		<div id="navbar-back" @click="$router.replace('/')" v-if="$store.state.room.roomId !== null">
			<ion-icon name="arrow-back-circle-outline" />
		</div>
		<div id="navbar-title">
			Pain In My Deck!
		</div>
		<div id="navbar-info" v-if="$store.state.user.username !== ''">
			Room<br/>{{ $store.state.room.roomId }}
		</div>
	</div>
</template>

<script>
export default {
	name: 'NavBar'
}
</script>

<style>
#navbar {
	position: relative;

	width: 100%;
	height: 100%;

	background: var(--gray-400);

	color: #fff;
	-webkit-user-select: none;
     -moz-user-select: none;
			-ms-user-select: none;
					user-select: none;
}

#navbar-back {
	display: flex;
	align-items: center;
	justify-content: center;

	height: 100%;
	left: 7px;

	position: absolute;

	cursor: pointer;

	transition: transform 0.2s ease;
}
#navbar-back:hover {
	transform: scale(1.2);
}
#navbar-back ion-icon {
	grid-column: 1;
	font-size: 20pt;
}

#navbar-title {
	display: flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	width: 80%;
	left: 10%;
	height: 100%;

	font-weight: 500;
}

#navbar-info {
	display: flex;
	align-items: center;
	position: absolute;
	right: 10px;

	height: 100%;
	
	font-size: 0.8em;
}
</style>
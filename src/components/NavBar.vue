<template>
	<div id="navbar">
		<div id="navbar-back" @click="$router.replace('/')" v-if="$store.state.room.roomId !== null">
			<ion-icon name="arrow-back-circle-outline" />
		</div>
		<div id="navbar-title">
			Pain In My Deck!
		</div>
		<transition name="navbar-info">
			<div id="navbar-info" v-if="$store.state.user.username !== ''" @click="copyRoomId">
				Room<br/>{{ $store.state.room.roomId }}
			</div>
		</transition>
	</div>
</template>

<script>
export default {
	name: 'NavBar',
	methods: {
		copyRoomId() {
			navigator.clipboard.writeText(this.$store.state.room.roomId);
		}
	}
}
</script>

<style>
#navbar {
	position: sticky;
	top: 0;

	width: 100%;
	height: 100%;

	background: var(--gray-400);

	color: #fff;
	-webkit-user-select: none;
     -moz-user-select: none;
			-ms-user-select: none;
					user-select: none;
	
	z-index: 2400;
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

	transition: transform 0.2s ease-out;
}

.navbar-info-enter, .navbar-info-leave-to {
	transform: translateX(200%);
}
</style>
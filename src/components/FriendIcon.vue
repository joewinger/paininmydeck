<template>
	<div class="friendIcon" :class="{ needsToPlay: !this.playedThisTurn}" :style="`background-color:${this.color}`">{{this.username.substring(0, 1)}}</div>
</template>

<script>
export default {
	name: 'FriendIcon',
	props: {
		username: String,
		color: String,
		playedThisTurn: Boolean,
		isCzar: Boolean
	}
}
</script>

<style scoped>
.friendIcon {
	position: relative;

	width: 40px;
	height: 40px;
	margin-left: 10px;

	border-radius: 20px;

	color: #F2F2F2;
	font-size: 16pt;
	line-height: 43px;
	font-weight: 500;

  transition: all 0.2s;
}

.friendIcon.us {
	position: absolute;
	left: 10px;
	top: 8px;
	margin-left: 0;
}

.friendIcon.needsToPlay:before {
	width: 5px;
	height: 5px;
	position: absolute;
	left: calc(50% - 2.5px);
	top: 10px;
	background-color: red;
}
</style>
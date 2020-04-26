<template>
	<div class="friendIcon">
		{{ this.username.substring(0, 1) }}
	</div>
</template>

<script>
export default {
	name: 'FriendIcon',
	props: {
		username: String,
		color: String,
		playedThisTurn: Boolean,
		isCzar: Boolean
	},
	computed: {
		cssVars() {
			return {
				'--bg-color': this.color
			}
		}
	}
}
</script>

<style scoped>
.friendIcon {
	display: flex;
	position: relative;
	align-items: center;
	text-align: center;

	width: 40px;
	height: 40px;

	background-color: var(--bg-color);
	border-radius: 20px;
	border: solid 1px red;

	color: #F2F2F2;
	text-align: left;
	font-size: 16pt;
	font-weight: 500;

  transition: all 0.2s;
}
.friendIcon.us {
	position: absolute;
	left: 10px;
	top: 10px;
}
</style>
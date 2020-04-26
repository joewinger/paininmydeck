<template>
	<div id="friendBar">
		<FriendIcon class="us" :username="this.$store.state.user.username" :color="this.$store.state.user.color"></FriendIcon>

		<ol>
			<li v-for="user in this.$store.state.room.users" :key="user.username">
				<FriendIcon :username="user.username" :color="user.color"></FriendIcon>
			</li>
		</ol>
	</div>
</template>

<script>
import FriendIcon from '@/components/FriendIcon.vue'

export default {
	name: 'FriendBar',
	components: {
		FriendIcon
	}
}
</script>

<style scoped>
#friendBar {
	position: relative;

	width: 360px;
	height: 60px;
	overflow: hidden;

	background: #fff;
	border: 2px solid #E0E0E0;
	border-radius: 30px;
}

ol {
	display: flex;
	position: absolute;
	flex-direction: row;
	top: 10px;
	right: 10px;

	padding: 0;
	margin: 0;
}

li {
	display: inline-block;
	margin: 0 5px;
}
li:last-of-type {
	margin-right: 0;
}
</style>
<template>
	<div id="friendBar">
		<FriendIcon class="us" :user="$store.getters['user/getUserObject']"></FriendIcon>

		<ol>
			<li v-for="user in $store.state.room.users" :key="user.username">
				<FriendIcon v-if="user.username != $store.state.user.username" :user="user"></FriendIcon>
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
	display: inline-block;

	width: 360px;
	height: 60px;
	margin-top: 20px;
	overflow: hidden;

	background: #fff;
	border: 2px solid #E0E0E0;
	border-radius: 30px;
}

ol {
	display: flex;
	position: absolute;
	flex-direction: row;
	top: 8px;
	right: 10px;

	padding: 0;
	margin: 0;
}

li {
	display: inline-block;
}
</style>
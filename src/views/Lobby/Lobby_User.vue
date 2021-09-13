<template>
	<div class="lobbyUser" :style="{ '--color-from': user.colorSet[0], '--color-to': user.colorSet[1] }" :class="{ 'kickable': isKickable }" :title="title" @click="kickPlayer">
		{{user.username}}
	</div>
</template>

<script>
export default {
	name: 'LobbyUser',
	props: {
		user: Object
	},
	methods: {
		kickPlayer() {
			if (!this.isKickable) return;

			this.$store.dispatch('room/kickPlayer', this.user.username);
		}
	},
	computed: {
		isKickable() {
			return this.$store.state.user.isPrivileged && this.user.username !== this.$store.state.user.username;
		},
		title() {
			return this.isKickable ? `Kick ${this.user.username}` : '';
		}
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
	background-image: linear-gradient(to right, var(--color-from) 0%, var(--color-to) 100%);

	color: #FFF;
	font-weight: 600;
}
.lobbyUser.kickable:hover {
	cursor: pointer;
}
</style>
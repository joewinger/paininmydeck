<template>
	<div id="modalWrapper">
		<div id="setUsernameModal">
			<h3>What should we call you?</h3>
			<input type="text" v-model="username" @keyup.enter="addUser" placeholder="Your username" autofocus>
			<button @click="addUser">Set Username</button>
		</div>
	</div>
</template>

<script>
import dbManager from '../dbManager';

export default {
	name: 'SetUsernameModal',
	data () {
		return {
			username: localStorage.getItem('username') || ''
		}
	},
	methods: {
		addUser() {
			if(this.$store.state.room.users.some((user) => user.username == this.username)) { // Is there already a user with this name?
				console.log(`Username ${this.username} already in use :(`);
				this.username = '';
				return;
			}

			localStorage.setItem('username', this.username);
			dbManager.addUser(this.username);
		}
	}
}
</script>

<style scoped>
#modalWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	position: fixed;
	z-index: 9998;
	top: 0;
	left: 0;

	width: 100%;
	height: 100%;

	background-color: #4F4F4F64;
}
#setUsernameModal {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-evenly;

	width: 300px;
	height: 250px;
	border-radius: 15px;
	border: 3px solid #E0E0E0;
	background: #FFFFFF;
}
</style>
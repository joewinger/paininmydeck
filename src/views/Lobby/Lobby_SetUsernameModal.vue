<template>
	<transition appear name="modal">
		<div id="modalWrapper">
			<div id="setUsernameModal">
				<h3>What should we call you?</h3>
				<input type="text" v-model="username" @keyup.enter="addUser" placeholder="Your username" autofocus>
				<button @click="addUser">Set Username</button>
			</div>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'SetUsernameModal',
	data () {
		return {
			// Prioritize session store, useful for testing in different tabs
			username: sessionStorage.getItem('username') || localStorage.getItem('username') || ''
		}
	},
	methods: {
		addUser() {
			if(this.username == '') {
				this.$store.dispatch('error', { message: 'Username can not be blank!', title: 'Invalid Username' });
				return;
			}
			if(this.$store.state.room.users.some((user) => user.username == this.username)) { // Is there already a user with this name?
				this.$store.dispatch('error', { message: `The username ${this.username} has already been taken!`, title: 'Invalid Username' });
				this.username = '';
				return;
			}

			sessionStorage.setItem('username', this.username);
			localStorage.setItem('username', this.username);
			this.$game.addUser(this.username);
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
	z-index: 2500;
	top: 0;
	left: 0;
	backdrop-filter: blur(1.4px);

	width: 100%;
	height: 100%;

	background-color: #45474B64;
	
	-webkit-transition: all 0.3s ease;
	-moz-transition: all 0.3s ease;
	-ms-transition: all 0.3s ease;
	-o-transition: all 0.3s ease;
	transition: all 0.3s ease;
}
#setUsernameModal {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-evenly;
	z-index: 2501;

	width: 300px;
	height: 250px;

	border-radius: 15px;
	border: 3px solid #E0E0E0;
	background: #FFFFFF;
	
  transition: all 0.3s ease;
}

.modal-enter,
.modal-leave-to {
  opacity: 0;
}

.modal-enter #setUsernameModal,
.modal-leave-to #setUsernameModal {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
<template>
  <div id="home">
		<h1>Room {{this.$root.$data.roomData.roomId}}</h1>

		<h1>{{this.$root.$data.roomData.winner.username}} won!</h1>

		<br>
		<ol>
			<li v-for="user in sortedUsers" :key="user.username">{{user.username}} - {{user.points}} points</li>
		</ol>

    <button @click="goHome">Go Back Home</button>
  </div>
</template>

<script>
export default {
	name: 'EndGame',
	data() {
		return {
			sortedUsers: this.$root.$data.roomData.users.sort((a, b) => (a.points > b.points) ? -1 : 1)
		};
	},
  methods: {
		goHome() {
			this.$router.push('/');
		}
  }
}
</script>

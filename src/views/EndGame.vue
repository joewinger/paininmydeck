<template>
  <div id="home">
		<h1>Room {{this.$store.state.room.roomId}}</h1>

		<h1>{{this.$store.state.room.winner.username}} won!</h1>

		<br>
		<ol>
			<li v-for="user in this.$store.getters['room/sortedUsers']" :key="user.username">{{user.username}} - {{user.points}} points</li>
		</ol>

    <button @click="goHome">Go Back Home</button>
  </div>
</template>

<script>
export default {
	name: 'EndGame',
  methods: {
		goHome() {
			this.$router.push('/');
		}
  }
}
</script>

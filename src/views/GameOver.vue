<template>
  <div id="gameover">
		<h1>Room {{this.$store.state.room.roomId}}</h1>

		<h1>{{this.$store.state.room.winner.username}} won!</h1>

		<br>
		<ol>
			<li v-for="user in this.$store.getters['room/sortedUsers']" :key="user.username">{{user.username}} - {{user.points}} points</li>
		</ol>

    <button @click="$router.replace('/')">Go Back Home</button>
  </div>
</template>

<script>
export default {
	name: 'GameOver'
}
</script>

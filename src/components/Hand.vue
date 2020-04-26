<template>
	<ul id="hand">
		<li v-for="card in this.cards" :key="card.id">
			<WhiteCard :text="card"></WhiteCard>
		</li>
	</ul>
</template>

<script>
import WhiteCard from '@/components/WhiteCard.vue'

export default {
	name: 'Hand',
	props: ['cards'],
	components: {
		WhiteCard
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#hand {
	display: flex;
	position: relative;

	width: 100vw;
	margin: 0;
	margin-top: 30px;

	overflow-x: scroll;
	overflow-y: visible;
}
li:first-of-type {
	margin-left: 15px;
}
</style>
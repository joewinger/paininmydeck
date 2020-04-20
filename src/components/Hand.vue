<template>
  <div id="hand">
		<ul>
			<li v-for="card in this.cards" :key="card.id">
				<WhiteCard :text="card"></WhiteCard>
			</li>
		</ul>
  </div>
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
li {
	margin-bottom: -100px;
}
</style>
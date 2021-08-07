<template>
	<ul id="hand">
		<li v-for="card in this.cards" :key="card.id">
			<WhiteCard :text="card"></WhiteCard>
		</li>
	</ul>
</template>

<script>
import WhiteCard from '@/components/WhiteCard'

export default {
	name: 'Hand',
	props: ['cards'],
	components: {
		WhiteCard
	}
}
</script>

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
li {
	margin-left: 10px;
}
li:first-of-type {
	margin-left: 15px;
}
li:last-of-type {
	padding-right: 10px;
}
</style>
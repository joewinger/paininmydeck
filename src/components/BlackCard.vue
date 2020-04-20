<template>
  <div class="blackCard">
    {{ this.text | blankify }}
  </div>
</template>

<script>
export default {
	name: 'BlackCard',
	props: {
		text: String
	}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.blackCard {
	display: inline-block;
	background: #000;
	color: #FFF;
	border-radius: 15px;

	text-align: left;
	font-size: 18pt;
	font-weight: bold;

	padding: 15px;

	width: 200px;
	height: 200px;

	overflow-y: scroll;
}
</style>
<template>
	<div id="infoBar">
		{{ this.text }}
	</div>
</template>

<script>
export default {
	name: 'InfoBar',
	props: {
		text: String
	}
}
</script>

<style scoped>
#infoBar {
	display: inline-block;
	padding: 0 35px;

	height: 30px;
	border-radius: 15px;
	
	background: #646464;
	box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);

	color: #fff;
	font-size: 11pt;
	font-weight: 500;
	line-height: 32px;
	text-align: center;
}
</style>
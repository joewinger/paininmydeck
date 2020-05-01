<template>
	<div class="statusBarButton">
		<slot></slot>
	</div>
</template>

<script>
export default {
	name: 'StatusBarButton'
}
</script>

<style scoped>
.statusBarButton {
	position: relative;
	
	height: 40px;

	border-radius: 20px;
	border: 3px solid #E0E0E0;
	padding: 0 15px;

	color: #828282;
	font-size: 18px;
	line-height: 36px;
	font-weight: 700;

	transition: all 0.2s;
}
.statusBarButton.active {
	background-color: #E0E0E0;
	color: #777;
}
</style>
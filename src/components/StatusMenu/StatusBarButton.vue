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
	display: flex;
	align-items: center;
	justify-content: center;
	
	height: 40px;
	width: 40px;

	border-radius: 20px;
	border: 3px solid #E0E0E0;

	color: #828282;

	transition: all 0.2s;
}
.statusBarButton.active {
	background-color: #E0E0E0;
	color: #777;
}
</style>
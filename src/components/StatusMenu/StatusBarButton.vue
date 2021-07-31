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
	
	height: 36px;
	width: 36px;

	border-radius: 20px;
	border: var(--ui-border-width) solid var(--gray-200);

	color: var(--gray-300);

	transition: all 0.2s;
}
.statusBarButton.active {
	border: var(--ui-border-width) solid var(--gray-200);
	background-color: var(--gray-100);
}
</style>
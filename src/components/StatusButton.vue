<template>
	<div class="statusButton">
		<slot></slot>
	</div>
</template>

<script>
export default {
	name: 'StatusButton'
}
</script>

<style scoped>
.statusButton {
	height: 40px;

	border-radius: 20px;
	border: 3px solid #E0E0E0;
	padding: 0 15px;

	color: #828282;
	font-size: 18px;
	line-height: 36px;
	font-weight: 700;
}
</style>
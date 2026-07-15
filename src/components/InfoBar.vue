<template>
	<div id="infoBar">
		{{ text }}
	</div>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<style scoped>
#infoBar {
	display: inline-block;
	padding: 0 35px;
	margin-bottom: 10px;

	height: 30px;
	border-radius: 15px;
	
	background: var(--gray-300);
	box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);

	color: #fff;
	font-size: 11pt;
	font-weight: 500;
	line-height: 32px;
}
</style>

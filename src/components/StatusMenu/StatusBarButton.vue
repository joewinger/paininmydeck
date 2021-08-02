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
.statusBarButton.notification::after {
	content: '';

	position: absolute;
	top: 6px;
	right: 6px;
	
	width: 5px;
	height: 5px;
	
	border: 2px solid white;
	border-radius: 100%;
	background: var(--accent-300);

	animation: pulse 8s infinite ease;
}

@keyframes pulse {
	0% {
		transform: scale(0.9);
	}
	10% {
		transform: scale(1.1);
	}
	20% {
		transform: scale(0.9);
	}
	30% {
		transform: scale(1.1);
	}
	40% {
		transform: scale(0.9);
	}
	50% {
		transform: scale(1.1);
	}
	60% {
		transform: scale(0.9);
	}
	70% {
		transform: scale(1.1);
	}
	80% {
		transform: scale(0.9);
	}
	90% {
		transform: scale(1.7);
	}
	100% {
		transform: scale(0.9);
	}
}
</style>
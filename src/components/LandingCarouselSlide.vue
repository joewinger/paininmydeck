<template>
	<div :class="{ 'carousel-slide': true, 'active': active }" :style="{ '--color': slideData.color }">
		<div class="img" :style="{'--src': `url(&quot;${slideData.imgSrc}&quot;)`}"></div>
		<h3 class="title">{{ slideData.title }}</h3>
		<p class="description">{{ slideData.description }}</p>
  </div>
</template>

<script setup lang="ts">
export interface LandingSlide {
	color: string;
	imgSrc: string;
	title: string;
	description: string;
}

defineProps<{ slideData: LandingSlide; active: boolean }>();
</script>

<style lang="scss" scoped>
.carousel-slide {
	flex: 0 0 min(600px, 90vw);
	box-sizing: border-box;
	padding: 10px;
	margin: 0 10vw;
	
	border-radius: 15px;
	background-color: var(--color);
	transition: box-shadow 0.5s;
	box-shadow: 0px 0px 15px -5px rgba(177, 177, 177, 0.5), 0px 4px 4px rgba(177, 177, 177, 0.25);

	scroll-snap-align: center;

	&.active {
		box-shadow: 0 0 0 5px var(--color);
	}
	&:not(.active) {
		// box-shadow: 0 0 0 10px var(--color);
	}

	.img {
		width: 100%;
		height: 400px;
		background-color: #fff;
		background: var(--src) no-repeat center center;
    -webkit-background-size: cover;
    -moz-background-size: cover;
    -o-background-size: cover;
    background-size: cover;

		border-radius: 10px;
	}
	.title {
		margin: 28px 15px 10px;

		font: 36px "Bungee";
		color: white;
	}
	.description {
		margin: 0 15px 20px;

		font: 16px "Inter";
		color: white;
	}

	@media screen and (max-width: 800px) {
		margin: 0 0 50px 0;

		.img {
			height: 350px;
		}
	}
}
</style>

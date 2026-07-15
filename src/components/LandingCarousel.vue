<template>
  <div ref="root" class="carousel">
    <div class="btn-left" @click="moveCarousel(-1)"><ion-icon name="arrow-back" /></div>
    <div class="btn-right" @click="moveCarousel(1)"><ion-icon name="arrow-forward" /></div>
    <div class="scroll-port">
      <landing-carousel-slide
        v-for="(slide, index) in slidesArray"
        :key=index
        :slide-data=slide
				:active="(slideIndex==index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import LandingCarouselSlide, { type LandingSlide } from './LandingCarouselSlide.vue';

const props = defineProps<{ slidesArray: LandingSlide[] }>();
const root = ref<HTMLElement | null>(null);
const slideIndex = ref(0);
const mouseHovering = ref(false);
let mounted = false;
let autoTimer: number | undefined;
let initialFrame: number | undefined;
let layoutFrame: number | undefined;

function moveCarousel(change: number) {
	if (!mounted || !root.value) return;
	const scrollPort = root.value.querySelector<HTMLElement>('.scroll-port');
	const slide = root.value.querySelector<HTMLElement>('.carousel-slide');
	if (!scrollPort || !slide) return;
	const slideStyle = getComputedStyle(slide);
	const slideWidth = slide.offsetWidth + parseInt(slideStyle.marginLeft) + parseInt(slideStyle.marginRight);

	if (change < 0 && scrollPort.scrollLeft < slideWidth) {
		scrollPort.scrollTo(scrollPort.scrollWidth, 0);
		return;
	}
	if (change > 0 && scrollPort.scrollWidth - scrollPort.scrollLeft - scrollPort.offsetWidth < slideWidth) {
		scrollPort.scrollTo(0, 0);
		return;
	}
	scrollPort.scrollTo(scrollPort.scrollLeft + slideWidth * change, 0);
}

onMounted(() => {
	mounted = true;
	const scrollPort = root.value?.querySelector<HTMLElement>('.scroll-port');
	const slide = root.value?.querySelector<HTMLElement>('.carousel-slide');
	if (!scrollPort || !slide || !root.value) return;
	const scrollPortStyle = getComputedStyle(scrollPort);
	const slideStyle = getComputedStyle(slide);
	const slideWidth = slide.clientWidth + parseInt(slideStyle.marginLeft) + parseInt(slideStyle.marginRight);

	scrollPort.onscroll = () => {
		slideIndex.value = Math.round((scrollPort.scrollLeft - parseInt(scrollPortStyle.paddingLeft) - parseInt(slideStyle.marginLeft)) / slideWidth);
		slideIndex.value = Math.max(0, Math.min(slideIndex.value, props.slidesArray.length - 1));
	};
	root.value.onmouseover = () => { mouseHovering.value = true; };
	root.value.onmouseout = () => { mouseHovering.value = false; };
	// Vue 2 mounted after the browser had resolved the initial snap position.
	// Waiting for layout preserves its initial one-slide advance under Vue 3.
	initialFrame = window.requestAnimationFrame(() => {
		layoutFrame = window.requestAnimationFrame(() => {
			const firstSlideCenter = slide.offsetLeft - (scrollPort.clientWidth - slide.clientWidth) / 2;
			scrollPort.scrollTo(firstSlideCenter + slideWidth, 0);
		});
	});
	autoTimer = window.setInterval(() => {
		if (!mouseHovering.value) moveCarousel(1);
	}, 5_000);
});

onBeforeUnmount(() => {
	mounted = false;
	if (initialFrame !== undefined) window.cancelAnimationFrame(initialFrame);
	if (layoutFrame !== undefined) window.cancelAnimationFrame(layoutFrame);
	if (autoTimer !== undefined) window.clearInterval(autoTimer);
});
</script>

<style lang="scss" scoped>
.carousel {
  position: relative;
  margin: 0 0 100px 0;

  .btn-left, .btn-right {
		display: flex;
		justify-content: center;
		align-items: center;
    position: absolute;
    top: calc(50% - 20px);

    width: 40px;
    height: 40px;

    border-radius: 100%;
		background: #FFF;
		box-shadow: 0px 0px 15px -5px rgba(177, 177, 177, 0.5), 0px 4px 4px rgba(177, 177, 177, 0.25);
		cursor: pointer;
		
		font: 24px "Inter";
	
    z-index: 50;
  }
  .btn-left {
    left: calc(
      (100% - min(600px, 90vw)) / 2 - 90px
    ); // 90px = button width + gutter size
  }
  .btn-right {
    right: calc((100% - min(600px, 90vw)) / 2 - 90px);
  }

  .scroll-port {
    display: flex;
    flex-direction: row;

    width: 100vw;
    padding: 30px 50vw;
    overflow-x: scroll;
    box-sizing: border-box;

    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;

		/* Hide scroll bar */
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    &::-webkit-scrollbar {
      display: none;
    }
  }

	@media screen and (max-width: 800px) {
		.carousel{
			margin: 0;

			.btn-left, .btn-right {
				display: none;
			}

			.scroll-port {
				flex-direction: column;
				padding: 30px 5vw;
			}
		}
	}
}
</style>

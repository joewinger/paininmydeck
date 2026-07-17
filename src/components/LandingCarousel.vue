<template>
  <section class="pimd-carousel" aria-label="Game features">
    <div class="pimd-carousel__controls">
      <button type="button" aria-label="Previous feature" @click="moveCarousel(-1)">←</button>
      <p aria-live="polite">{{ slideIndex + 1 }} / {{ slidesArray.length }}</p>
      <button type="button" aria-label="Next feature" @click="moveCarousel(1)">→</button>
    </div>

    <ol
      ref="scrollPort"
      class="pimd-carousel__track"
      tabindex="0"
      aria-label="Game feature cards"
      @scroll="syncSlideIndex"
    >
      <li v-for="(slide, index) in slidesArray" :key="slide.title">
        <landing-carousel-slide :slide-data="slide" :active="slideIndex === index" />
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import LandingCarouselSlide, { type LandingSlide } from './LandingCarouselSlide.vue';

const props = defineProps<{ slidesArray: LandingSlide[] }>();
const scrollPort = ref<HTMLOListElement | null>(null);
const slideIndex = ref(0);
let scrollFrame: number | undefined;

function scrollToSlide(index: number): void {
  const port = scrollPort.value;
  if (!port || props.slidesArray.length === 0) return;
  const slides = port.querySelectorAll<HTMLElement>(':scope > li');
  const nextIndex = (index + slides.length) % slides.length;
  const slide = slides[nextIndex];
  if (!slide) return;

  slideIndex.value = nextIndex;
  port.scrollTo({
    left: slide.offsetLeft - (port.clientWidth - slide.clientWidth) / 2,
    behavior: 'smooth',
  });
}

function moveCarousel(change: number): void {
  scrollToSlide(slideIndex.value + change);
}

function syncSlideIndex(): void {
  if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
  scrollFrame = window.requestAnimationFrame(() => {
    const port = scrollPort.value;
    if (!port) return;
    const center = port.scrollLeft + port.clientWidth / 2;
    const slides = Array.from(port.querySelectorAll<HTMLElement>(':scope > li'));
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    slideIndex.value = nearestIndex;
  });
}

onBeforeUnmount(() => {
  if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame);
});
</script>

<style scoped>
.pimd-carousel {
  display: grid;
  gap: 15px;
  min-width: 0;
}

.pimd-carousel__controls {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.pimd-carousel__controls button {
  display: grid;
  place-items: center;
  width: 46px;
  min-height: 42px;
  padding: 0;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper);
  box-shadow: 3px 4px 0 var(--pimd-meta);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 22px;
  line-height: 1;
}

.pimd-carousel__controls button:hover {
  transform: translateY(-2px);
  border-color: var(--pimd-ink);
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.pimd-carousel__controls button:active {
  transform: translate(2px, 3px);
  box-shadow: 1px 1px 0 var(--pimd-meta);
}

.pimd-carousel__controls p {
  min-width: 56px;
  margin: 0;
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 12px;
  text-align: center;
}

.pimd-carousel__track {
  display: flex;
  gap: clamp(18px, 3vw, 34px);
  width: 100%;
  margin: 0;
  padding: 18px max(20px, calc((100vw - 610px) / 2)) 28px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  list-style: none;
}

.pimd-carousel__track::-webkit-scrollbar {
  display: none;
}

.pimd-carousel__track > li {
  flex: 0 0 min(570px, calc(100vw - 40px));
  scroll-snap-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .pimd-carousel__track {
    scroll-behavior: auto;
  }
}
</style>

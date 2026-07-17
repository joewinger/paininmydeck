<template>
  <article
    class="carousel-slide"
    :class="{ 'carousel-slide--active': active }"
    :style="{ '--feature-color': slideData.color }"
    :aria-current="active ? 'true' : undefined"
  >
    <div class="carousel-slide__symbol" aria-hidden="true">
      <ion-icon :name="slideData.icon" />
    </div>
    <div class="carousel-slide__copy">
      <p>{{ slideData.eyebrow }}</p>
      <h3>{{ slideData.title }}</h3>
      <span>{{ slideData.description }}</span>
    </div>
    <small aria-hidden="true">Pain in my Deck! / field note</small>
  </article>
</template>

<script setup lang="ts">
export interface LandingSlide {
  color: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
}

defineProps<{ slideData: LandingSlide; active: boolean }>();
</script>

<style scoped>
.carousel-slide {
  position: relative;
  display: grid;
  grid-template-columns: 132px 1fr;
  gap: clamp(22px, 5vw, 42px);
  min-height: 300px;
  padding: clamp(30px, 6vw, 48px);
  transform: rotate(-0.4deg) scale(0.97);
  border: 4px solid var(--pimd-ink);
  background:
    linear-gradient(rgb(87 169 191 / 13%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(87 169 191 / 13%) 1px, transparent 1px),
    var(--pimd-paper);
  background-size: 18px 18px;
  box-shadow: 8px 10px 0 var(--feature-color);
  color: var(--pimd-ink);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.carousel-slide--active {
  transform: rotate(0.4deg) scale(1);
  box-shadow: 10px 13px 0 var(--feature-color);
}

.carousel-slide::before {
  position: absolute;
  top: -12px;
  left: 51%;
  width: 76px;
  height: 25px;
  transform: rotate(-5deg);
  background: rgb(221 212 189 / 88%);
  content: '';
  clip-path: polygon(3% 8%, 98% 0, 93% 92%, 0 100%);
}

.carousel-slide__symbol {
  display: grid;
  place-items: center;
  align-self: center;
  aspect-ratio: 0.82;
  transform: rotate(-5deg);
  border: 4px solid var(--pimd-ink);
  border-radius: 7px;
  background: var(--feature-color);
  box-shadow: 4px 5px 0 rgb(45 37 64 / 22%);
  color: var(--pimd-ink);
}

.carousel-slide__symbol ion-icon {
  width: 68%;
  height: 68%;
  --ionicon-stroke-width: 34px;
}

.carousel-slide__copy {
  align-self: center;
}

.carousel-slide__copy p {
  display: inline-block;
  margin: 0 0 12px;
  padding: 5px 8px 4px;
  transform: rotate(-1deg);
  background: var(--feature-color);
  font-family: 'Bungee', sans-serif;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
}

.carousel-slide__copy h3 {
  margin: 0 0 14px;
  font-family: 'Bungee', sans-serif;
  font-size: clamp(28px, 5vw, 43px);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.035em;
  text-transform: uppercase;
}

.carousel-slide__copy span {
  color: var(--pimd-ink-soft);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
}

.carousel-slide > small {
  position: absolute;
  right: 18px;
  bottom: 13px;
  color: var(--pimd-ink-soft);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 560px) {
  .carousel-slide {
    grid-template-columns: 1fr;
    min-height: 410px;
    padding: 38px 28px 42px;
  }

  .carousel-slide__symbol {
    width: 104px;
  }
}
</style>

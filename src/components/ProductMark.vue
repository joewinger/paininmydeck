<template>
  <span
    class="pimd-product-mark"
    :class="`pimd-product-mark--${variant}`"
    role="img"
    aria-label="Pain in my Deck!"
  >
    <span class="pimd-product-mark__pain">Pain</span>
    <span class="pimd-product-mark__in-my">
      <span>in</span>
      <span>my</span>
    </span>
    <span class="pimd-product-mark__deck">Deck!</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'hero' | 'compact' }>(), {
  variant: 'compact',
});
</script>

<style scoped>
.pimd-product-mark {
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-weight: 400;
  text-transform: uppercase;
}

.pimd-product-mark span {
  display: block;
}

.pimd-product-mark--hero {
  width: min-content;
  font-size: clamp(82px, 27vw, 124px);
  line-height: 0.74;
  letter-spacing: -0.075em;
  text-align: center;
}

.pimd-product-mark--hero .pimd-product-mark__pain {
  transform: rotate(-3deg) skew(-2deg);
}

.pimd-product-mark--hero .pimd-product-mark__in-my {
  display: flex;
  justify-content: center;
  gap: 0.24em;
  margin: 0.24em 0 0.16em;
  transform: rotate(1deg);
  font-size: 0.42em;
  line-height: 0.7;
  letter-spacing: -0.04em;
}

.pimd-product-mark--hero .pimd-product-mark__in-my > span {
  display: inline;
}

.pimd-product-mark--hero .pimd-product-mark__deck {
  transform: rotate(-4deg) skew(-3deg);
  font-size: 0.9em;
}

.pimd-product-mark--compact {
  --pimd-mark-card-text: var(--pimd-highlight);

  display: inline-flex;
  align-items: center;
  gap: 0.15em;
  font-size: clamp(14px, 3.8vw, 21px);
  line-height: 1;
}

.pimd-product-mark--compact > span {
  display: inline;
}

.pimd-product-mark--compact .pimd-product-mark__in-my {
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  width: 0.86em;
  height: 1.04em;
  min-width: 0;
  padding: 0.08em 0.04em 0.06em;
  transform: rotate(-1deg);
  border: 0;
  border-radius: 0.05em;
  background: currentColor;
  font-size: inherit;
  line-height: 1;
  text-align: center;
}

.pimd-product-mark--compact .pimd-product-mark__in-my > span {
  display: grid;
  min-height: 0;
  place-items: center;
  color: var(--pimd-mark-card-text);
  font-size: 0.42em;
  line-height: 1;
}
</style>

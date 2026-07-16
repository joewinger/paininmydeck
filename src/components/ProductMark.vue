<template>
  <span class="pimd-product-mark" :class="`pimd-product-mark--${variant}`" role="img" aria-label="Pain in my Deck!">
    <span class="pimd-product-mark__pain">Pain</span>
    <span class="pimd-product-mark__in-my">in my</span>
    <span class="pimd-product-mark__deck">Deck!</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'hero' | 'compact' | 'badge' }>(), {
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
  margin: 0.24em 0 0.16em;
  transform: rotate(1deg);
  font-size: 0.42em;
  line-height: 0.7;
  letter-spacing: -0.04em;
}

.pimd-product-mark--hero .pimd-product-mark__deck {
  transform: rotate(-4deg) skew(-3deg);
  font-size: 0.9em;
}

.pimd-product-mark--compact {
  display: flex;
  align-items: baseline;
  gap: 0.28em;
  font-size: clamp(14px, 3.8vw, 21px);
  line-height: 1;
}

.pimd-product-mark--compact span {
  display: inline;
}

.pimd-product-mark--compact .pimd-product-mark__in-my {
  font-size: 0.72em;
}

.pimd-product-mark--badge {
  display: grid;
  place-content: center;
  width: 56px;
  height: 56px;
  transform: rotate(-4deg);
  border: 3px solid var(--pimd-paper);
  border-radius: 50%;
  background: var(--pimd-action);
  box-shadow: 3px 4px 0 var(--pimd-ink);
  color: var(--pimd-paper);
  font-size: 8px;
  line-height: 0.92;
  text-align: center;
}

@media (min-width: 780px) {
  .pimd-product-mark--badge {
    width: 66px;
    height: 66px;
    font-size: 9px;
  }
}
</style>

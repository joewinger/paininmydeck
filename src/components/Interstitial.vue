<template>
  <transition appear name="interstitial">
    <div v-if="ui.interstitial.title" id="interstitial" role="status" aria-live="assertive">
      <span class="interstitial-stripe interstitial-stripe--status" aria-hidden="true" />
      <span class="interstitial-stripe interstitial-stripe--meta" aria-hidden="true" />
      <section class="interstitial-slip pimd-paper">
        <span class="pimd-tape interstitial-slip__tape" aria-hidden="true" />
        <p class="pimd-eyebrow">Pain in my Deck!</p>
        <h1>{{ ui.interstitial.title }}</h1>
        <h2 v-if="ui.interstitial.subtitle">{{ ui.interstitial.subtitle }}</h2>
        <span class="interstitial-slip__rule" aria-hidden="true" />
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
</script>

<style scoped>
#interstitial {
  --duration: 4s;
  position: fixed;
  inset: 0;
  z-index: 2800;
  display: none;
  place-items: center;
  width: 100vw;
  height: 100svh;
  padding: 24px;
  overflow: hidden;
  transform: translateX(150vw);
  background: rgb(45 37 64 / 72%);
  cursor: default;
  user-select: none;
  will-change: transform;
  transition: transform var(--duration) cubic-bezier(0.14, 0.84, 0.86, 0.16);
}

.interstitial-slip {
  z-index: 2;
  width: min(560px, calc(100vw - 42px));
  min-height: min(370px, 54vh);
  padding: clamp(45px, 9vw, 72px) clamp(25px, 8vw, 52px) 44px;
  transform: rotate(-1.2deg);
  text-align: left;
  filter: drop-shadow(12px 14px 0 rgb(45 37 64 / 42%));
}

.interstitial-slip__tape {
  top: -5px;
  left: 50%;
  width: 86px;
  transform: translateX(-50%) rotate(-8deg);
  background: rgb(255 214 74 / 90%);
}

.interstitial-slip h1 {
  margin: 22px 0 15px;
  color: var(--pimd-action);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(3.35rem, 15vw, 7rem);
  font-weight: 400;
  line-height: 0.82;
  letter-spacing: -0.055em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.interstitial-slip h2 {
  max-width: 32ch;
  margin: 0;
  color: var(--pimd-ink);
  font-size: clamp(1rem, 4vw, 1.35rem);
  font-weight: 850;
  line-height: 1.35;
}

.interstitial-slip__rule {
  display: block;
  width: 42%;
  height: 8px;
  margin-top: 28px;
  transform: rotate(-1deg);
  background: var(--pimd-status);
  clip-path: polygon(0 24%, 100% 0, 95% 100%, 3% 75%);
}

.interstitial-stripe {
  position: absolute;
  z-index: 0;
  width: 142vw;
  height: 90px;
  border-block: 4px solid var(--pimd-ink);
  background: var(--pimd-action);
  box-shadow: 0 14px 0 rgb(45 37 64 / 24%);
}

.interstitial-stripe--status {
  transform: rotate(-11deg);
  background: var(--pimd-status);
}

.interstitial-stripe--meta {
  z-index: 1;
  height: 54px;
  transform: rotate(13deg);
  background: var(--pimd-meta);
}

.interstitial-enter-from {
  transform: translateX(-150vw);
}

.interstitial-enter-active {
  display: grid !important;
}

.interstitial-enter-to {
  transform: translateX(150vw);
}

@media (max-height: 560px) {
  .interstitial-slip {
    min-height: 0;
    padding-block: 36px 31px;
  }

  .interstitial-slip h1 {
    margin-block: 12px 9px;
    font-size: clamp(2.65rem, 11vh, 4.5rem);
  }

  .interstitial-slip__rule {
    margin-top: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #interstitial {
    transform: none;
    transition: opacity var(--duration) step-end;
  }

  #interstitial.interstitial-enter-from,
  #interstitial.interstitial-enter-to {
    transform: none;
    opacity: 1;
  }
}

@media (forced-colors: active) {
  #interstitial {
    background: Canvas;
  }

  .interstitial-slip {
    border: 4px solid CanvasText;
    filter: none;
  }

  .interstitial-stripe {
    display: none;
  }
}
</style>

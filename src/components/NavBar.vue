<template>
  <nav id="navbar" aria-label="Game navigation">
    <div class="navbar-side navbar-side--start">
      <button
        v-if="game.roomId !== null"
        id="navbar-back"
        type="button"
        aria-label="Return home"
        @click="router.replace('/')"
      >
        <ion-icon name="arrow-back-circle-outline" aria-hidden="true" />
      </button>
    </div>

    <div id="navbar-title">
      <product-mark variant="compact" />
    </div>

    <div class="navbar-side navbar-side--end">
      <transition name="navbar-info">
        <button
          v-if="game.username !== ''"
          id="navbar-info"
          type="button"
          :aria-label="`Copy room code ${game.roomId ?? ''}`"
          title="Copy room code"
          @click="copyRoomId"
        >
          <span class="navbar-info__label">Room</span>
          <span class="navbar-info__code">{{ game.roomId }}</span>
        </button>
      </transition>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import ProductMark from '@/components/ProductMark.vue';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const game = useGameStore();

async function copyRoomId() {
  if (!game.roomId) return;
  try {
    await navigator.clipboard.writeText(game.roomId);
  } catch {
    // Clipboard access can be denied; room details remain available in the status menu.
  }
}
</script>

<style>
#navbar {
  position: sticky;
  top: 0;
  z-index: 2400;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(52px, 1fr) auto minmax(72px, 1fr);
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 clamp(8px, 2.5vw, 18px);
  border-bottom: 4px solid var(--pimd-ink);
  background:
    linear-gradient(90deg, rgb(255 255 255 / 7%) 1px, transparent 1px) 0 0 / 18px 100%,
    linear-gradient(175deg, var(--pimd-wood) 0 49%, var(--pimd-wood-dark) 50% 54%, var(--pimd-wood) 55% 100%);
  box-shadow: 0 5px 0 rgb(45 37 64 / 16%);
  color: var(--pimd-paper);
  user-select: none;
}

#navbar::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 7px 0 auto;
  height: 2px;
  background: rgb(255 250 240 / 18%);
  pointer-events: none;
}

.navbar-side {
  display: flex;
  align-items: center;
  min-width: 0;
}

.navbar-side--start {
  justify-content: flex-start;
}

.navbar-side--end {
  justify-content: flex-end;
}

#navbar-back,
#navbar-info {
  margin: 0;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper);
  box-shadow: 3px 4px 0 var(--pimd-ink);
  color: var(--pimd-ink);
  line-height: 1;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    background-color 120ms ease;
}

#navbar-back {
  width: 46px;
  height: 46px;
  min-height: 46px;
  padding: 9px;
  transform: rotate(-2deg);
}

#navbar-back ion-icon {
  width: 24px;
  height: 24px;
  font-size: 24px;
}

#navbar-back:hover,
#navbar-info:hover {
  transform: translateY(-1px) rotate(1deg);
  border-color: var(--pimd-ink);
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
  box-shadow: 3px 5px 0 var(--pimd-ink);
}

#navbar-back:active,
#navbar-info:active {
  transform: translate(2px, 3px);
  border-color: var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 1px 1px 0 var(--pimd-ink);
}

#navbar-title {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 8px 13px 7px;
  transform: rotate(-1deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 3px 4px 0 var(--pimd-ink);
  clip-path: polygon(2% 4%, 98% 0, 100% 94%, 3% 100%);
}

#navbar-info {
  display: grid;
  min-width: 68px;
  min-height: 48px;
  padding: 5px 8px 4px;
  transform: rotate(1deg);
  text-align: center;
}

.navbar-info__label,
.navbar-info__code {
  display: block;
}

.navbar-info__label {
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  line-height: 1;
  text-transform: uppercase;
}

.navbar-info__code {
  margin-top: 2px;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
}

.navbar-info-enter-active,
.navbar-info-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.navbar-info-enter-from,
.navbar-info-leave-to {
  opacity: 0;
  transform: translateX(24px) rotate(4deg);
}

@media (max-width: 420px) {
  #navbar {
    grid-template-columns: minmax(48px, 1fr) auto minmax(64px, 1fr);
    padding-inline: 6px;
  }

  #navbar-title {
    padding-inline: 9px;
  }

  #navbar-info {
    min-width: 62px;
    padding-inline: 5px;
  }

  .navbar-info__code {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #navbar-back,
  #navbar-info,
  .navbar-info-enter-active,
  .navbar-info-leave-active {
    transition-duration: 0.01ms;
  }
}

@media (forced-colors: active) {
  #navbar,
  #navbar-title,
  #navbar-back,
  #navbar-info {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }
}
</style>

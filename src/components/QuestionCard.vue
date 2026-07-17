<template>
  <article
    class="questionCard"
    :class="{ sticky }"
    :style="{
      '--czar-color-from': game.czarColorSet[0],
      '--czar-color-to': game.czarColorSet[1],
    }"
    @click="toggleSticky"
  >
    <span class="questionCard__tape" aria-hidden="true"></span>

    <div class="questionCard__meta">
      <span>Round {{ roundNumber }} / {{ czarName }} is judging</span>
      <small>Question card</small>
    </div>

    <p id="question-card-copy" class="questionCard__copy">{{ blankify(text) }}</p>

    <div class="questionCard__footer">
      <span aria-hidden="true">{{ sticky ? 'Pinned for this round' : 'Moves with the page' }}</span>
      <button
        type="button"
        class="questionCard__pin pimd-interactive"
        :aria-label="sticky ? 'Unpin question' : 'Pin question'"
        aria-describedby="question-card-copy"
        :aria-pressed="sticky"
        @click.stop="toggleSticky"
      >
        <span aria-hidden="true">{{ sticky ? 'Unpin' : 'Pin' }}</span>
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { blankify } from '@/shared/protocol';

defineProps<{ text: string }>();
const emit = defineEmits<{ stickyChange: [sticky: boolean] }>();
const game = useGameStore();
const sticky = ref(true);
const roundNumber = computed(() => String(game.turn.round || 1).padStart(2, '0'));
const czarName = computed(() => game.czar?.displayName ?? 'The Czar');

function toggleSticky() {
  sticky.value = !sticky.value;
  emit('stickyChange', sticky.value);
}
</script>

<style scoped>
.questionCard {
  position: relative;
  z-index: 1800;
  display: grid;
  gap: 17px;
  width: 100%;
  min-height: 225px;
  margin: 0;
  padding: 31px 21px 22px;
  transform: rotate(0.35deg);
  border: 4px solid var(--pimd-ink);
  background-color: var(--pimd-paper);
  background-image:
    linear-gradient(var(--pimd-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--pimd-grid) 1px, transparent 1px);
  background-size: 18px 18px;
  box-shadow: 6px 8px 0 rgb(45 37 64 / 20%);
  color: var(--pimd-ink);
  cursor: pointer;
  transition:
    transform 140ms ease,
    filter 140ms ease;
}

.questionCard:hover {
  transform: translateY(-2px) rotate(-0.15deg);
  box-shadow: 7px 10px 0 rgb(45 37 64 / 24%);
}

.questionCard.sticky {
  position: var(--question-sticky-position, sticky);
  top: var(--question-sticky-top, calc(var(--navbar-height) + 14px));
}

.questionCard__tape {
  position: absolute;
  top: -11px;
  right: 13%;
  z-index: 2;
  width: 74px;
  height: 24px;
  transform: rotate(8deg);
  background: linear-gradient(90deg, var(--czar-color-from), var(--czar-color-to));
  opacity: 0.88;
  clip-path: polygon(4% 9%, 98% 0, 94% 91%, 0 100%);
}

.questionCard__meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  font-family: 'Bungee', sans-serif;
  font-size: clamp(8px, 2.4vw, 10px);
  line-height: 1.2;
  text-transform: uppercase;
}

.questionCard__meta > span {
  min-width: 0;
}

.questionCard__meta small {
  flex: 0 0 auto;
  font: inherit;
  color: var(--pimd-ink-soft);
}

.questionCard__copy {
  align-self: center;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--pimd-ink);
  font-size: clamp(26px, 7.5vw, 39px);
  font-weight: 850;
  line-height: 1.04;
  letter-spacing: -0.045em;
}

.questionCard__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 3px;
  border-top: 2px solid rgb(45 37 64 / 32%);
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  line-height: 1;
  text-transform: uppercase;
}

.questionCard__pin {
  width: auto;
  min-width: 55px;
  min-height: 34px;
  margin: 0;
  padding: 7px 9px;
  transform: rotate(-1deg);
  border: 2px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-meta);
  box-shadow: 2px 3px 0 var(--pimd-ink);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  line-height: 1;
  text-transform: uppercase;
}

.questionCard__pin:hover {
  transform: translateY(-1px) rotate(1deg);
  border-color: var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 2px 4px 0 var(--pimd-ink);
  color: var(--pimd-ink);
}

.questionCard__pin:active {
  transform: translate(2px, 2px);
  border-color: var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: none;
}

@media (min-width: 760px) {
  .questionCard {
    min-height: 280px;
    padding: 37px 27px 25px;
  }

  .questionCard__copy {
    font-size: clamp(31px, 3.6vw, 43px);
  }
}

@media (forced-colors: active) {
  .questionCard,
  .questionCard__pin {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
    filter: none;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .questionCard,
  .questionCard__pin {
    transition-duration: 0.01ms;
  }
}
</style>

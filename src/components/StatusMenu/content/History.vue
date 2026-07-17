<template>
  <section
    id="statusMenuContent-history"
    class="statusMenuContent"
    aria-labelledby="round-history-title"
  >
    <h1 id="round-history-title">Round History</h1>

    <div v-if="game.roundHistory.length === 0" class="initial">
      <span class="pimd-eyebrow">Nothing filed yet</span>
      <p>Check back after the first round.</p>
    </div>

    <div v-else class="round-list" tabindex="0" aria-label="Completed rounds, newest first">
      <article v-for="round in historyRounds" :key="round.round" class="round">
        <header class="round-heading">
          <span class="round-number">Round {{ round.round }}</span>
          <h2 class="question">{{ blankify(round.question) }}</h2>
        </header>

        <ol class="answers" :aria-label="`Answers from round ${round.round}`" tabindex="0">
          <li class="miniCard winningAnswer">
            <span class="miniCard-badge">Winner</span>
            <strong class="miniCard-text">{{ round.winningAnswer }}</strong>
            <span class="miniCard-player">{{ round.winningPlayerDisplayName }}</span>
          </li>
          <li
            v-for="answer in round.otherAnswers"
            :key="`${answer.playedByPlayerId}-${answer.text}`"
            class="miniCard"
          >
            <strong class="miniCard-text">{{ answer.text }}</strong>
            <span class="miniCard-player">{{ answer.playedByDisplayName }}</span>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { blankify } from '@/shared/protocol';

const game = useGameStore();
const historyRounds = computed(() => [...game.roundHistory].reverse());
</script>

<style scoped>
#statusMenuContent-history {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.initial {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 190px;
  padding: 28px 20px;
  transform: rotate(-0.5deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 5px 6px 0 var(--pimd-primary-dark);
  text-align: center;
}

.initial p {
  max-width: 24ch;
  margin: 0;
  color: var(--pimd-ink);
  font-weight: 800;
}

.round-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 18px;
  padding: 2px 9px 14px 2px;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-color: var(--pimd-primary-dark) transparent;
  scrollbar-gutter: stable;
}

.round {
  min-width: 0;
  padding: 16px 0 18px;
  border-bottom: 3px dashed rgb(45 37 64 / 32%);
}

.round:last-child {
  border-bottom: 0;
}

.round-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.round-number {
  display: inline-flex;
  align-items: center;
  min-height: 29px;
  padding: 6px 8px 5px;
  transform: rotate(-1deg);
  background: var(--pimd-primary);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.61rem;
  line-height: 1;
  text-transform: uppercase;
  clip-path: polygon(2% 0, 100% 5%, 96% 100%, 0 92%);
}

.round .question {
  margin: 0;
  color: var(--pimd-ink);
  font-size: 0.96rem;
  font-weight: 900;
  line-height: 1.35;
}

.answers {
  display: flex;
  gap: 13px;
  width: 100%;
  padding: 6px 7px 12px 3px;
  margin: 14px 0 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  list-style: none;
  scroll-padding-inline: 3px;
  scroll-snap-type: x proximity;
}

.miniCard {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 134px;
  min-height: 150px;
  padding: 29px 13px 11px;
  transform: rotate(0.6deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-meta);
  color: var(--pimd-ink);
  scroll-snap-align: start;
}

.miniCard:nth-child(even) {
  transform: rotate(-0.75deg);
  box-shadow: 4px 5px 0 var(--pimd-primary);
}

.miniCard-text {
  font-size: 0.87rem;
  font-weight: 850;
  line-height: 1.26;
  overflow-wrap: anywhere;
}

.miniCard-player {
  align-self: end;
  padding-top: 11px;
  border-top: 2px solid currentColor;
  font-family: 'Bungee', sans-serif;
  font-size: 0.54rem;
  font-weight: 400;
  line-height: 1.15;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.miniCard-badge {
  position: absolute;
  top: 8px;
  left: 9px;
  padding: 4px 6px 3px;
  transform: rotate(-2deg);
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.49rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.miniCard.winningAnswer {
  border-color: var(--pimd-ink);
  background: var(--pimd-primary);
  box-shadow: 4px 5px 0 var(--pimd-highlight);
  color: var(--pimd-ink);
}

@media (forced-colors: active) {
  .initial,
  .miniCard {
    border: 3px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
}
</style>

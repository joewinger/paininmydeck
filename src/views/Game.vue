<template>
  <div id="game" class="pimd-screen game-screen" :data-phase="game.phase.toLowerCase()">
    <div class="game-layout">
      <aside class="game-prompt-column" aria-label="Round prompt">
        <dl class="game-round-meta" aria-label="Round status">
          <div>
            <dt>Round</dt>
            <dd>{{ roundNumber }}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{{ roleLabel }}</dd>
          </div>
          <div>
            <dt>Answers in</dt>
            <dd>{{ submittedCount }} / {{ expectedAnswerCount }}</dd>
          </div>
        </dl>

        <div class="game-prompt-stack" :class="{ 'game-prompt-stack--sticky': questionPinned }">
          <question-card :text="questionText" @sticky-change="questionPinned = $event" />

          <info-bar v-if="infoStatus" :text="infoStatus.text" :kind="infoStatus.kind" />
        </div>
      </aside>

      <section class="game-card-area" aria-labelledby="game-phase-heading">
        <div class="game-phase-header">
          <div class="pimd-section-label">
            <h1 id="game-phase-heading">{{ phaseHeading }}</h1>
          </div>
          <p>{{ phaseInstruction }}</p>
        </div>

        <transition-group
          id="card-container"
          tag="div"
          name="cards"
          role="list"
          :aria-label="cardSetLabel"
        >
          <white-card
            v-for="(card, index) in cardSet"
            :key="card.id"
            role="listitem"
            :style="{ '--delay': index * 0.3 + 's' }"
            :index="index"
            :card="card"
            :facedown="(game.playedThisTurn || game.isCzar) && game.phase === 'COLLECTING'"
          />
        </transition-group>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import InfoBar from '@/components/InfoBar.vue';
import QuestionCard from '@/components/QuestionCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import { useGameStore } from '@/stores/game';
import type { Card, PlayedCard } from '@/shared/protocol';

const game = useGameStore();
const questionText = computed(() => game.turn.questionCard);
const czarName = computed(() => game.czar?.displayName ?? 'the Czar');
const roundNumber = computed(() => String(game.turn.round || 1).padStart(2, '0'));
const submittedCount = computed(() => game.playedPlayerIds.length);
const expectedAnswerCount = computed(() => Math.max(game.users.length - 1, 0));
const roleLabel = computed(() => (game.isCzar ? 'Card Czar' : 'Player'));
const questionPinned = ref(true);

type InfoStatusKind = 'connecting' | 'reconnecting' | 'waiting' | 'role' | 'action' | 'success';

const infoStatus = computed<{ text: string; kind: InfoStatusKind } | null>(() => {
  if (game.connectionState === 'connecting')
    return { text: 'Connecting to the room...', kind: 'connecting' };
  if (game.connectionState === 'reconnecting')
    return { text: 'Reconnecting to the room...', kind: 'reconnecting' };
  const disconnected = game.users
    .filter((player) => !player.connected)
    .map((player) => player.displayName);
  if (disconnected.length === 1)
    return { text: `Waiting for ${disconnected[0]} to reconnect...`, kind: 'waiting' };
  if (disconnected.length > 1)
    return { text: `Waiting for ${disconnected.join(', ')} to reconnect...`, kind: 'waiting' };
  if (game.phase === 'REVEAL') {
    const winner = game.turn.winningCard?.playedByDisplayName;
    return {
      text: winner ? `${winner} wins the round!` : 'The winner is in!',
      kind: 'success',
    };
  }
  if (game.isCzar)
    return game.phase === 'JUDGING'
      ? { text: 'Select the winning card!', kind: 'action' }
      : { text: 'You are the Card Czar!', kind: 'role' };
  if (game.playedThisTurn) {
    if (game.phase === 'COLLECTING')
      return { text: 'Waiting for everyone to play a card!', kind: 'waiting' };
    if (game.phase === 'JUDGING')
      return { text: `Waiting for ${czarName.value} to pick a winner...`, kind: 'waiting' };
  }
  return null;
});

const phaseHeading = computed(() => {
  if (game.phase === 'REVEAL' || game.turn.winningCard) return 'The room has spoken';
  if (game.isCzar)
    return game.phase === 'JUDGING' ? 'Pick the winning card' : 'Waiting on answers';
  if (game.playedThisTurn)
    return game.phase === 'JUDGING' ? 'The Czar is choosing' : 'Your card is in';
  return 'Pick one from your hand';
});

const phaseInstruction = computed(() => {
  if (game.phase === 'REVEAL' || game.turn.winningCard)
    return 'The winning card takes the spotlight before the next round.';
  if (game.isCzar) {
    if (game.phase === 'JUDGING') return 'Tap one answer to award the point.';
    return 'The answers stay hidden until everyone has played.';
  }
  if (game.playedThisTurn) {
    if (game.phase === 'JUDGING') return `Waiting for ${czarName.value} to make the call.`;
    return 'Answers will flip when everyone has played.';
  }
  return 'Tap a card to play it immediately. Swipe to redraw.';
});

const cardSetLabel = computed(() => {
  if (game.turn.winningCard) return 'Winning answer';
  if (game.isCzar || game.playedThisTurn) return 'Submitted answers';
  return 'Your answer cards';
});

const cardSet = computed<(Card | PlayedCard)[]>(() => {
  if (game.turn.winningCard) return [game.turn.winningCard];
  if (game.isCzar || game.playedThisTurn) return game.turn.playedCards;
  return game.hand;
});

onBeforeRouteLeave((to) => {
  if (to.name !== 'home' || game.beingKicked || game.terminalExit !== null) return true;
  return window.confirm("Are you sure you'd like to leave in the middle of this game?");
});
</script>

<style>
#game {
  width: 100%;
  min-width: 0;
}

.game-screen {
  padding: clamp(16px, 4vw, 36px) clamp(14px, 4vw, 40px) 112px;
  scroll-behavior: smooth;
}

.game-layout {
  display: grid;
  gap: 14px;
  width: min(100%, 1160px);
  margin-inline: auto;
}

.game-prompt-column {
  display: contents;
  min-width: 0;
}

.game-prompt-stack {
  display: contents;
}

.game-round-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
  margin: 0;
  transform: rotate(-0.35deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 4px 5px 0 var(--pimd-ink);
  color: var(--pimd-ink);
}

.game-round-meta > div {
  min-width: 0;
  padding: 8px 7px 7px;
  text-align: center;
}

.game-round-meta > div + div {
  border-left: 2px solid var(--pimd-ink);
}

.game-round-meta dt,
.game-round-meta dd {
  margin: 0;
}

.game-round-meta dt {
  font-family: 'Bungee', sans-serif;
  font-size: clamp(7px, 2.2vw, 10px);
  line-height: 1;
  text-transform: uppercase;
}

.game-round-meta dd {
  margin-top: 4px;
  overflow: hidden;
  font-size: clamp(11px, 3.1vw, 15px);
  font-weight: 900;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-prompt-column #infoBar {
  transform: rotate(0.35deg);
  box-shadow: 4px 5px 0 var(--pimd-meta);
}

.game-card-area {
  display: grid;
  align-content: start;
  gap: 17px;
  min-width: 0;
  margin-top: 10px;
}

.game-phase-header {
  display: grid;
  gap: 8px;
}

.game-phase-header > p {
  max-width: 48rem;
  margin: 0 auto;
  color: var(--pimd-ink-soft);
  font-size: clamp(12px, 3.2vw, 15px);
  font-weight: 750;
  line-height: 1.35;
  text-align: center;
}

#card-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px));
  justify-content: center;
  gap: clamp(14px, 4vw, 20px);
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 7px 0 16px;
  perspective: 800px;
}

/* Transition-group needs a short removal buffer before the staggered hand arrives. */
.cards-enter-active {
  transition: opacity calc(0.3s + var(--delay));
}

.cards-enter-from,
.cards-leave-to {
  opacity: 0;
}

.whiteCard.cards-move {
  transition: transform 0s;
}

.game-screen[data-phase='reveal'] .whiteCard.winner,
.game-screen[data-phase='reveal'] .whiteCard.winner:disabled,
.game-screen[data-phase='reveal'] .whiteCard.winner:hover {
  background-color: var(--pimd-primary);
  color: var(--pimd-ink);
}

.game-screen[data-phase='reveal'] .whiteCard.winner .card-meta {
  color: var(--pimd-ink);
}

@media (min-width: 760px) {
  .game-screen {
    padding-bottom: 124px;
  }

  .game-layout {
    grid-template-columns: minmax(290px, 370px) minmax(0, 1fr);
    align-items: start;
    gap: clamp(24px, 5vw, 48px);
  }

  .game-prompt-column {
    display: grid;
    align-self: stretch;
    align-content: start;
    gap: 14px;
  }

  .game-prompt-stack {
    --question-sticky-position: relative;
    --question-sticky-top: auto;

    display: grid;
    align-content: start;
    gap: 14px;
  }

  .game-prompt-stack--sticky {
    position: sticky;
    top: calc(var(--navbar-height) + 14px);
    z-index: 1800;
  }

  .game-card-area {
    margin-top: 0;
    padding-top: 2px;
  }

  #card-container {
    grid-template-columns: repeat(auto-fit, minmax(145px, 180px));
  }
}

@media (min-width: 1080px) {
  .game-layout {
    grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
  }

  #card-container {
    grid-template-columns: repeat(3, minmax(155px, 180px));
  }
}

@media (forced-colors: active) {
  .game-round-meta {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }
}
</style>

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

        <div v-if="selectionMode" class="game-confirmation-panel">
          <p class="game-confirmation-copy" aria-live="polite">
            <span>{{ confirmationEyebrow }}</span>
            <strong>{{ confirmationMessage }}</strong>
          </p>
          <div class="game-confirmation-actions">
            <button
              v-if="selectedCard"
              type="button"
              class="pimd-secondary-button"
              :disabled="confirmationPending"
              @click="cancelSelection"
            >
              Cancel
            </button>
            <button
              type="button"
              class="pimd-primary-button"
              :disabled="!canConfirmSelection"
              @click="confirmSelection"
            >
              {{ confirmationButtonLabel }}
            </button>
          </div>
        </div>

        <p
          v-if="showsPlayerHand"
          class="game-blank-stack-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ blankStackAnnouncement }}
        </p>

        <transition-group
          id="card-container"
          tag="div"
          name="cards"
          role="list"
          :aria-label="cardSetLabel"
        >
          <white-card
            v-for="(entry, index) in presentedCardSet"
            :key="entry.card.id"
            role="listitem"
            :style="{ '--delay': index * 0.3 + 's' }"
            :index="index"
            :card="entry.card"
            :blank-count="entry.blankCount"
            :facedown="(game.playedThisTurn || game.isCzar) && game.phase === 'COLLECTING'"
            :selected="selectedCardId === entry.card.id"
            :confirmation-pending="confirmationPending && selectedCardId === entry.card.id"
            :blank-text="blankDrafts[entry.card.id] ?? ''"
            @select="selectCard"
            @update:blank-text="updateBlankDraft(entry.card.id, $event)"
          />
        </transition-group>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import InfoBar from '@/components/InfoBar.vue';
import QuestionCard from '@/components/QuestionCard.vue';
import WhiteCard from '@/components/WhiteCard.vue';
import {
  isEditableBlankCard,
  presentHandCards,
  type PresentedHandCard,
} from '@/views/blankCardStack';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';
import type { Card, PlayedCard } from '@/shared/protocol';

const game = useGameStore();
const ui = useUiStore();
const questionText = computed(() => game.turn.questionCard);
const czarName = computed(() => game.czar?.displayName ?? 'the Czar');
const roundNumber = computed(() => String(game.turn.round || 1).padStart(2, '0'));
const submittedCount = computed(() => game.playedPlayerIds.length);
const expectedAnswerCount = computed(() => Math.max(game.users.length - 1, 0));
const roleLabel = computed(() => (game.isCzar ? 'Card Czar' : 'Player'));
const questionPinned = ref(true);
const selectedCardId = ref<string | null>(null);
const blankDrafts = reactive<Record<string, string>>({});
const confirmationPending = ref(false);

type SelectionMode = 'answer' | 'winner';

const selectionMode = computed<SelectionMode | null>(() => {
  if (game.phase === 'COLLECTING' && !game.isCzar && !game.playedThisTurn) return 'answer';
  if (game.phase === 'JUDGING' && game.isCzar && game.turn.winningCard === null) return 'winner';
  return null;
});

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
    if (game.phase === 'JUDGING') return 'Select an answer, then choose the winner.';
    return 'The answers stay hidden until everyone has played.';
  }
  if (game.playedThisTurn) {
    if (game.phase === 'JUDGING') return `Waiting for ${czarName.value} to make the call.`;
    return 'Answers will flip when everyone has played.';
  }
  return 'Select a card, then confirm it. Swipe to redraw.';
});

const cardSetLabel = computed(() => {
  if (game.turn.winningCard) return 'Winning answer';
  if (game.isCzar || game.playedThisTurn) return 'Submitted answers';
  return 'Your answer cards';
});

const showsPlayerHand = computed(
  () => !game.turn.winningCard && !game.isCzar && !game.playedThisTurn,
);

const cardSet = computed<(Card | PlayedCard)[]>(() => {
  if (game.turn.winningCard) return [game.turn.winningCard];
  if (game.isCzar || game.playedThisTurn) return game.turn.playedCards;
  return game.hand;
});
const presentedCardSet = computed<PresentedHandCard[]>(() =>
  showsPlayerHand.value
    ? presentHandCards(game.hand, selectedCardId.value)
    : cardSet.value.map((card) => ({ card })),
);
const blankCardCount = computed(() => game.hand.filter(isEditableBlankCard).length);
const blankStackAnnouncement = computed(() => {
  const count = blankCardCount.value;
  if (count === 0) return 'No blank cards in your hand.';
  return `${count} blank ${count === 1 ? 'card' : 'cards'} in your hand. Writing an answer uses one blank card.`;
});

const selectedCard = computed(() =>
  cardSet.value.find((card) => card.id === selectedCardId.value),
);
const selectedBlankText = computed(() =>
  selectedCard.value ? (blankDrafts[selectedCard.value.id] ?? '').trim().slice(0, 60) : '',
);
const selectedCardIsBlank = computed(() => selectedCard.value?.text.startsWith('%BLANK%') ?? false);
const blankSelectionError = computed(() => {
  if (!selectedCardIsBlank.value) return null;
  if (!selectedBlankText.value) return 'Write an answer on the selected blank card.';
  if (selectedBlankText.value.startsWith('%BLANK%')) return 'Blank answers cannot begin with %BLANK%.';
  return null;
});
const confirmationEyebrow = computed(() =>
  selectionMode.value === 'winner' ? 'Czar decision' : 'Your selection',
);
const confirmationMessage = computed(() => {
  if (game.cardActionPending && !confirmationPending.value) return 'Another card action is finishing…';
  if (!selectedCard.value)
    return selectionMode.value === 'winner'
      ? 'Select an answer before choosing the winner.'
      : 'Select one card from your hand.';
  if (blankSelectionError.value) return blankSelectionError.value;
  return selectedCardIsBlank.value ? selectedBlankText.value : selectedCard.value.text;
});
const confirmationButtonLabel = computed(() => {
  if (confirmationPending.value)
    return selectionMode.value === 'winner' ? 'Choosing…' : 'Playing…';
  return selectionMode.value === 'winner' ? 'Choose Winner' : 'Play Card';
});
const canConfirmSelection = computed(
  () =>
    selectedCard.value !== undefined &&
    blankSelectionError.value === null &&
    !confirmationPending.value &&
    !game.cardActionPending,
);
const selectionContext = computed(() => {
  return [
    game.self?.playerId ?? '',
    game.turn.roundId,
    game.phase,
    game.isCzar ? 'czar' : 'player',
  ].join('|');
});

function selectCard(cardId: string): void {
  if (!selectionMode.value || confirmationPending.value || game.cardActionPending) return;
  if (!cardSet.value.some((card) => card.id === cardId)) return;
  selectedCardId.value = cardId;
}

function updateBlankDraft(cardId: string, value: string): void {
  blankDrafts[cardId] = value.slice(0, 60);
}

function cancelSelection(): void {
  if (confirmationPending.value) return;
  selectedCardId.value = null;
}

function clearStaleSelection(): void {
  selectedCardId.value = null;
  for (const cardId of Object.keys(blankDrafts)) delete blankDrafts[cardId];
}

async function confirmSelection(): Promise<void> {
  const mode = selectionMode.value;
  const card = selectedCard.value;
  if (!mode || !card || confirmationPending.value || game.cardActionPending) return;
  if (blankSelectionError.value) {
    ui.notify({ message: blankSelectionError.value });
    return;
  }

  confirmationPending.value = true;
  game.cardActionPending = true;
  try {
    if (mode === 'winner') await game.chooseWinner(card.id);
    else if (selectedCardIsBlank.value) await game.submitBlank(card.id, selectedBlankText.value);
    else await game.submitCard(card.id);
    selectedCardId.value = null;
  } catch {
    // The store reports command failures in the existing toast. Keep the selection for retry.
  } finally {
    confirmationPending.value = false;
    game.cardActionPending = false;
  }
}

watch(selectionContext, clearStaleSelection, { flush: 'sync' });
watch(
  () => [selectedCardId.value, cardSet.value.map((card) => card.id).join('|')] as const,
  ([cardId]) => {
    if (cardId && !cardSet.value.some((card) => card.id === cardId)) clearStaleSelection();
  },
  { flush: 'sync' },
);

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

.game-confirmation-panel {
  display: grid;
  gap: 12px;
  padding: 13px 14px;
  transform: rotate(-0.25deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-meta);
}

.game-confirmation-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
  margin: 0;
}

.game-confirmation-copy span {
  color: var(--pimd-primary-dark);
  font-family: 'Bungee', sans-serif;
  font-size: 9px;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.game-confirmation-copy strong {
  overflow: hidden;
  color: var(--pimd-ink);
  font-size: 13px;
  font-weight: 850;
  line-height: 1.25;
  text-overflow: ellipsis;
}

.game-confirmation-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.game-confirmation-actions > :only-child {
  grid-column: 1 / -1;
}

.game-confirmation-actions button {
  min-height: 46px;
  padding: 9px 12px;
  font-size: 12px;
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

.game-blank-stack-status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

  .game-confirmation-panel {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .game-confirmation-actions {
    grid-template-columns: repeat(2, minmax(118px, auto));
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
  .game-round-meta,
  .game-confirmation-panel {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }
}
</style>

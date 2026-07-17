<template>
  <div
    ref="wrapperElement"
    class="whiteCard-wrapper"
    :class="{
      trashable: isTrashable,
      trashMode,
      'is-dragging': isDragging,
      'is-winner': isWinner,
      'is-facedown': effectiveFacedown,
    }"
    :style="cardStyle"
  >
    <button
      v-if="isTrashable"
      class="btn-trash"
      type="button"
      aria-label="Redraw card"
      :disabled="game.cardActionPending"
      @click="trashCard"
    >
      <ion-icon name="trash" aria-hidden="true" />
    </button>

    <component
      :is="cardTag"
      ref="cardElement"
      class="whiteCard"
      :class="classList"
      :type="isEditableBlank ? undefined : 'button'"
      :disabled="isEditableBlank ? undefined : !isCardActionable"
      :role="isEditableBlank ? 'group' : undefined"
      :aria-label="cardAriaLabel"
      :aria-busy="pending || undefined"
      @click="onClick"
    >
      <span v-if="effectiveFacedown" class="card-back" aria-hidden="true">
        <span>{{ facedownStamp }}</span>
      </span>

      <template v-else>
        <span class="card-index" aria-hidden="true">{{ displayIndex }}</span>
        <span class="card-meta" aria-hidden="true">{{ cardMeta }}</span>

        <span v-if="!isEditableBlank" class="card-text">{{ card.text }}</span>

        <template v-else-if="!pending">
          <textarea
            v-model="blanktext"
            class="blank-input"
            aria-label="Your blank answer"
            placeholder="Blank Card"
            maxlength="60"
            @focus="editing = true"
            @blur="onBlur"
          />
          <span
            v-if="editing && blanktext.length > 30"
            class="char-limit"
            aria-live="polite"
          >
            {{ blanktext.length }}/60
          </span>
          <transition name="save-btn">
            <button
              v-if="editing"
              class="btn-save"
              type="button"
              aria-label="Play blank answer"
              :disabled="game.cardActionPending"
              @pointerdown="preserveBlankSave"
              @click.stop="submitBlankCard"
            >
              <ion-icon name="checkmark" aria-hidden="true" />
            </button>
          </transition>
        </template>

        <span v-if="isWinner" class="ribbon">
          <span class="ribbon-content">
            <small>Played by</small>
            {{ game.turn.winningCard?.playedByDisplayName }}
          </span>
        </span>
      </template>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import interact from 'interactjs';
import type { Card, PlayedCard } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';

const props = withDefaults(defineProps<{ card: Card | PlayedCard; facedown?: boolean; index?: number }>(), {
	facedown: false,
	index: 0,
});
const game = useGameStore();
const ui = useUiStore();
const wrapperElement = ref<HTMLElement | null>(null);
const cardElement = ref<HTMLElement | null>(null);
const blanktext = ref('');
const editing = ref(false);
const disableClicks = ref(false);
const pending = ref(false);
const pendingAction = ref<'play' | 'choose-winner' | 'blank' | 'redraw' | null>(null);
const isDragging = ref(false);
const swipeOffset = ref(0);
const trashOpenOffset = ref(64);
const trashMode = ref(false);
const isEditableBlank = computed(() => props.card.text.startsWith('%BLANK%'));
const usesBlankFont = computed(() => Boolean(props.card.blank));
const isWinner = computed(() => game.turn.winningCard?.id === props.card.id);
const effectiveFacedown = computed(() => props.facedown || pending.value);
const isTrashable = computed(
  () =>
    !pending.value &&
    !isEditableBlank.value &&
    !usesBlankFont.value &&
    !game.playedThisTurn &&
    !game.isCzar,
);
const cardActionIntent = computed<'play' | 'choose-winner' | null>(() => {
  if (isEditableBlank.value || effectiveFacedown.value) return null;
  if (game.isCzar) {
    return game.phase === 'JUDGING' && game.turn.winningCard === null ? 'choose-winner' : null;
  }
  return game.phase === 'COLLECTING' && !game.playedThisTurn ? 'play' : null;
});
const isCardActionable = computed(
  () => cardActionIntent.value !== null && !disableClicks.value && !game.cardActionPending,
);
const cardTag = computed(() => (isEditableBlank.value ? 'div' : 'button'));
const displayIndex = computed(() => String(props.index + 1).padStart(2, '0'));
const cardMeta = computed(() => {
  if (isWinner.value) return 'Round winner';
  if (isEditableBlank.value) return 'Wild card';
  return game.isCzar || game.playedThisTurn
    ? `Candidate ${displayIndex.value}`
    : `Hand ${displayIndex.value}`;
});
const cardAccent = computed(() => {
  const accents = ['var(--pimd-meta)', 'var(--pimd-secondary)', 'var(--pimd-highlight)'];
  return accents[props.index % accents.length];
});
const cardStyle = computed<Record<string, string>>(() => ({
  '--card-accent': cardAccent.value,
  '--card-tilt': props.index % 2 === 0 ? '-0.65deg' : '0.65deg',
  '--swipe-x': `${swipeOffset.value}px`,
  '--trash-open-offset': `${trashOpenOffset.value}px`,
}));
const facedownStamp = computed(() => {
  if (!pending.value) return 'Under wraps';
  if (pendingAction.value === 'choose-winner') return 'Choosing…';
  if (pendingAction.value === 'redraw') return 'Redrawing…';
  return 'Sending…';
});
const cardAriaLabel = computed(() => {
  if (pending.value) {
    if (pendingAction.value === 'choose-winner') return 'Choosing winner';
    if (pendingAction.value === 'redraw') return 'Redrawing card';
    if (pendingAction.value === 'blank') return 'Submitting blank answer';
    return 'Submitting answer';
  }
  if (effectiveFacedown.value) return `Hidden answer ${props.index + 1}`;
  if (isWinner.value) {
    const player = game.turn.winningCard?.playedByDisplayName ?? 'another player';
    return `Winning answer: ${props.card.text}. Played by ${player}`;
  }
  if (isEditableBlank.value) return 'Write your own answer';
  if (cardActionIntent.value === 'choose-winner') return `Choose winner: ${props.card.text}`;
  if (cardActionIntent.value === 'play') return `Play answer: ${props.card.text}`;
  return `Answer: ${props.card.text}`;
});
const classList = computed(() => ({
  facedown: effectiveFacedown.value,
  winner: isWinner.value,
  blank: isEditableBlank.value,
  blankfont: usesBlankFont.value && !isEditableBlank.value,
  actionable: isCardActionable.value,
  pending: pending.value,
}));
let peekTimer: number | undefined;
let closePeekTimer: number | undefined;
let blankSavePointerDown = false;

function clearPeekTimers() {
  if (peekTimer !== undefined) window.clearTimeout(peekTimer);
  if (closePeekTimer !== undefined) window.clearTimeout(closePeekTimer);
  peekTimer = undefined;
  closePeekTimer = undefined;
}

function closeTrashMode() {
  clearPeekTimers();
  trashMode.value = false;
  swipeOffset.value = 0;
}

function handleOutsideInteraction(event: Event) {
  const target = event.target;
  if (target instanceof Node && wrapperElement.value?.contains(target)) return;
  closeTrashMode();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeTrashMode();
}

async function onClick(mouseEvent: MouseEvent) {
  if (
    !props.card.text ||
    effectiveFacedown.value ||
    isDragging.value ||
    disableClicks.value ||
    game.cardActionPending
  )
    return;
  clearPeekTimers();
  if (trashMode.value) {
    closeTrashMode();
    return;
  }
  if (isEditableBlank.value) {
    const target = mouseEvent.target as HTMLElement;
    if (!target.closest('.blank-input, .btn-save')) {
      cardElement.value?.querySelector<HTMLTextAreaElement>('.blank-input')?.focus();
    }
    editing.value = true;
    return;
  }

  disableClicks.value = true;
  pendingAction.value = cardActionIntent.value;
  pending.value = true;
  game.cardActionPending = true;
  try {
    if (game.isCzar) {
      if (game.phase === 'JUDGING' && game.turn.winningCard === null) {
        await game.chooseWinner(props.card.id);
      }
    } else if (game.phase === 'COLLECTING' && !game.playedThisTurn) {
      await game.submitCard(props.card.id);
    }
  } catch {
    // The store reports command failures in the existing toast.
  } finally {
    pending.value = false;
    pendingAction.value = null;
    disableClicks.value = false;
    game.cardActionPending = false;
  }
}

function onBlur(event: FocusEvent) {
  if (blankSavePointerDown) return;
  if ((event.relatedTarget as HTMLElement | null)?.classList.contains('btn-save')) return;
  editing.value = false;
}

function preserveBlankSave() {
  blankSavePointerDown = true;
  window.setTimeout(() => {
    blankSavePointerDown = false;
  }, 500);
}

async function submitBlankCard() {
  editing.value = false;
  blanktext.value = blanktext.value.trim().slice(0, 60);
  if (!blanktext.value) {
    ui.notify({ message: "Blank cards can't be blank!" });
    return;
  }
  if (blanktext.value.startsWith('%BLANK%')) {
    ui.notify({ message: "Blank cards can't begin like that!" });
    blanktext.value = '';
    return;
  }
  disableClicks.value = true;
  pendingAction.value = 'blank';
  pending.value = true;
  game.cardActionPending = true;
  try {
    await game.submitBlank(props.card.id, blanktext.value);
  } catch {
    // The store reports command failures in the existing toast.
  } finally {
    pending.value = false;
    pendingAction.value = null;
    disableClicks.value = false;
    game.cardActionPending = false;
  }
}

async function trashCard() {
  if (game.cardActionPending) return;
  closeTrashMode();
  pendingAction.value = 'redraw';
  pending.value = true;
  game.cardActionPending = true;
  try {
    await game.redrawCard(props.card.id);
  } catch {
    // The store reports command failures in the existing toast.
  } finally {
    pending.value = false;
    pendingAction.value = null;
    game.cardActionPending = false;
  }
}

onMounted(() => {
  if (isTrashable.value && props.index === 0 && game.turn.round === 1) {
    peekTimer = window.setTimeout(() => {
      trashMode.value = true;
      closePeekTimer = window.setTimeout(() => {
        trashMode.value = false;
      }, 600);
    }, 4_000);
  }
  if (!cardElement.value) return;
  document.addEventListener('pointerdown', handleOutsideInteraction);
  document.addEventListener('focusin', handleOutsideInteraction);
  document.addEventListener('keydown', handleEscape);
  interact(cardElement.value)
    .draggable({
      startAxis: 'x',
      listeners: {
        start: () => {
          if (isTrashable.value) {
            clearPeekTimers();
            isDragging.value = true;
            const cardWidth = cardElement.value?.getBoundingClientRect().width ?? 140;
            trashOpenOffset.value = Math.min(76, Math.max(58, cardWidth * 0.46));
            swipeOffset.value = trashMode.value ? trashOpenOffset.value : 0;
            trashMode.value = false;
          }
        },
        move: (event) => {
          if (!isDragging.value) return;
          swipeOffset.value = Math.min(
            trashOpenOffset.value,
            Math.max(0, swipeOffset.value + event.dx),
          );
        },
        end: (event) => {
          if (!isDragging.value) return;
          const shouldOpen =
            swipeOffset.value >= trashOpenOffset.value * 0.48 || event.velocityX > 0.45;
          trashMode.value = shouldOpen;
          swipeOffset.value = shouldOpen ? trashOpenOffset.value : 0;
          window.setTimeout(() => {
            isDragging.value = false;
            swipeOffset.value = 0;
          }, 1);
        },
      },
    })
    .styleCursor(false);
});

onBeforeUnmount(() => {
  clearPeekTimers();
  document.removeEventListener('pointerdown', handleOutsideInteraction);
  document.removeEventListener('focusin', handleOutsideInteraction);
  document.removeEventListener('keydown', handleEscape);
  if (cardElement.value) interact(cardElement.value).unset();
});
</script>

<style>
.whiteCard-wrapper {
  --card-accent: var(--pimd-meta);
  --card-tilt: 0deg;
  --swipe-x: 0px;
  --trash-open-offset: 64px;
  --trash-button-transform: translateX(22px) rotate(70deg);

  position: relative;
  width: 100%;
  min-width: 0;
  aspect-ratio: 3 / 4;
  isolation: isolate;
}

.whiteCard-wrapper::before {
  position: absolute;
  inset: 7px -7px -8px 7px;
  z-index: 0;
  border: 3px solid var(--pimd-ink);
  background: var(--card-accent);
  box-shadow: 2px 3px 0 rgb(45 37 64 / 22%);
  content: '';
  pointer-events: none;
}

.whiteCard-wrapper.is-winner::before {
  background: var(--pimd-meta);
}

.whiteCard-wrapper.is-facedown::before {
  background: var(--pimd-primary-dark);
}

.whiteCard {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: visible;
  appearance: none;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background-color: var(--pimd-paper);
  background-image:
    linear-gradient(rgb(87 169 191 / 9%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(87 169 191 / 9%) 1px, transparent 1px);
  background-size: 17px 17px;
  box-shadow: none;
  color: var(--pimd-ink);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(15px, 4.2vw, 21px);
  font-weight: 850;
  line-height: 1.13;
  letter-spacing: -0.025em;
  text-align: left;
  hyphens: auto;
  overflow-wrap: anywhere;
  cursor: default;
  touch-action: pan-y;
  transform: translateX(var(--swipe-x)) rotate(var(--card-tilt));
  transform-origin: center;
  transition:
    transform 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.whiteCard:disabled {
  border-color: var(--pimd-ink);
  background-color: var(--pimd-paper);
  color: var(--pimd-ink);
  opacity: 1;
}

.whiteCard.actionable {
  cursor: pointer;
}

.whiteCard.actionable:hover {
  border-color: var(--pimd-ink);
  background-color: var(--pimd-paper);
  color: var(--pimd-ink);
  transform: translateY(-4px) rotate(0deg);
}

.whiteCard.actionable:active {
  border-color: var(--pimd-ink);
  background-color: var(--pimd-paper);
  color: var(--pimd-ink);
  transform: translate(5px, 6px) rotate(0deg);
}

.whiteCard:focus-visible,
.blank-input:focus-visible,
.btn-save:focus-visible,
.btn-trash:focus-visible {
  outline: 3px solid var(--pimd-ink);
  outline-offset: 4px;
  box-shadow: 0 0 0 7px var(--pimd-highlight);
}

.card-index {
  position: absolute;
  top: -9px;
  left: 10px;
  z-index: 3;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 3px solid var(--pimd-ink);
  border-radius: 50%;
  background: var(--card-accent);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.card-meta {
  position: absolute;
  right: 10px;
  bottom: 10px;
  left: 10px;
  z-index: 2;
  overflow: hidden;
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(7px, 1.9vw, 9px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.card-text {
  display: block;
  width: 100%;
  height: 100%;
  padding: 45px 13px 38px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.whiteCard.blankfont .card-text {
  font-family: 'Nanum Pen Script', 'Inter', sans-serif;
  font-size: clamp(25px, 7vw, 35px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: 0;
}

.whiteCard.blank {
  cursor: text;
  font-family: 'Nanum Pen Script', 'Inter', sans-serif;
}

.blank-input {
  position: absolute;
  inset: 39px 9px 37px;
  width: calc(100% - 18px);
  height: calc(100% - 76px);
  min-height: 0;
  padding: 10px;
  resize: none;
  border: 0;
  border-radius: 0;
  background: rgb(255 250 240 / 72%);
  color: var(--pimd-ink);
  font: 400 clamp(25px, 7vw, 35px) / 0.98 'Nanum Pen Script', 'Inter', sans-serif;
  letter-spacing: 0;
  text-align: left;
}

.blank-input:focus {
  background: var(--pimd-paper);
}

.blank-input::placeholder {
  color: var(--pimd-ink-soft);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(12px, 3.2vw, 15px);
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
}

.char-limit {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 3;
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.btn-save,
.btn-trash {
  display: grid;
  width: 44px;
  height: 44px;
  min-height: 44px;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 3px solid var(--pimd-ink);
  border-radius: 50%;
  color: var(--pimd-paper);
  line-height: 1;
}

.btn-save {
  position: absolute;
  right: 7px;
  bottom: 7px;
  z-index: 4;
  background: var(--pimd-primary);
  box-shadow: 3px 3px 0 var(--pimd-highlight);
  color: var(--pimd-on-primary);
}

.btn-save:hover:not(:disabled) {
  border-color: var(--pimd-ink);
  background: var(--pimd-primary-dark);
  color: var(--pimd-on-primary);
  transform: translateY(-2px);
}

.btn-save:active:not(:disabled) {
  border-color: var(--pimd-ink);
  background: var(--pimd-primary-dark);
  color: var(--pimd-on-primary);
  box-shadow: 1px 1px 0 var(--pimd-highlight);
  transform: translate(2px, 2px);
}

.btn-save:disabled {
  border-color: var(--pimd-ink);
  background: var(--pimd-primary);
  color: var(--pimd-on-primary);
  opacity: 0.55;
}

.btn-trash:disabled {
  border-color: var(--pimd-ink);
  background: var(--pimd-danger);
  color: var(--pimd-paper);
  opacity: 0.55;
}

.save-btn-enter-active,
.save-btn-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.save-btn-enter-from,
.save-btn-leave-to {
  opacity: 0;
  transform: scale(0.65);
}

.btn-trash {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 0;
  background: var(--pimd-danger);
  transform: var(--trash-button-transform);
  transition:
    transform 180ms ease,
    background-color 120ms ease;
}

.btn-trash:hover:not(:disabled) {
  border-color: var(--pimd-ink);
  background: var(--pimd-danger-dark);
  color: var(--pimd-paper);
  transform: var(--trash-button-transform);
}

.btn-trash:active:not(:disabled) {
  border-color: var(--pimd-ink);
  background: var(--pimd-danger-dark);
  color: var(--pimd-paper);
  transform: var(--trash-button-transform);
}

.whiteCard-wrapper.is-dragging .whiteCard,
.whiteCard-wrapper.is-dragging .whiteCard:hover,
.whiteCard-wrapper.is-dragging .whiteCard:active {
  z-index: 2;
  transform: translateX(var(--swipe-x)) rotate(var(--card-tilt));
  transition: none;
}

.whiteCard-wrapper.trashMode {
  --trash-button-transform: none;
}

.whiteCard-wrapper.trashMode .whiteCard,
.whiteCard-wrapper.trashMode .whiteCard:hover,
.whiteCard-wrapper.trashMode .whiteCard:active,
.btn-trash:focus-visible + .whiteCard,
.btn-trash:focus-visible + .whiteCard:hover,
.btn-trash:focus-visible + .whiteCard:active {
  z-index: 2;
  transform: translateX(var(--trash-open-offset)) rotate(2deg);
}

.btn-trash:focus-visible {
  --trash-button-transform: none;

  z-index: 0;
  transform: var(--trash-button-transform);
}

.whiteCard.facedown,
.whiteCard.facedown:disabled {
  overflow: hidden;
  border-color: var(--pimd-ink);
  background-color: var(--pimd-highlight);
  background-image: linear-gradient(
    135deg,
    var(--pimd-highlight) 0 49%,
    var(--pimd-primary) 49% 100%
  );
  background-repeat: no-repeat;
  background-size: 100% 100%;
  color: var(--pimd-ink);
  transform: rotate(var(--card-tilt));
}

.card-back {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
}

.card-back > span {
  display: grid;
  min-height: 72px;
  padding: 12px 16px;
  place-items: center;
  transform: rotate(-1.5deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 6px 7px 0 var(--pimd-meta);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(12px, 3vw, 16px);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: 0;
  text-align: center;
  text-transform: uppercase;
}

.whiteCard.pending .card-back > span {
  animation: pending-stamp 850ms steps(2, end) infinite;
}

.whiteCard.winner,
.whiteCard.winner:disabled,
.whiteCard.winner:hover {
  z-index: 3;
  border-color: var(--pimd-ink);
  background-color: var(--pimd-highlight);
  background-image:
    linear-gradient(rgb(45 37 64 / 9%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(45 37 64 / 9%) 1px, transparent 1px);
  color: var(--pimd-ink);
  transform: rotate(-0.8deg) scale(1.02);
}

.whiteCard.winner .card-index {
  background: var(--pimd-meta);
}

.whiteCard.winner .card-meta {
  top: 11px;
  right: 10px;
  bottom: auto;
  left: 50px;
  color: var(--pimd-ink);
  text-align: right;
}

.whiteCard.winner .card-text {
  padding-bottom: 70px;
}

.ribbon {
  position: absolute;
  right: -7px;
  bottom: 12px;
  left: -7px;
  z-index: 4;
  display: block;
  padding: 7px 10px 6px;
  transform: rotate(-1deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-meta);
  box-shadow: 3px 4px 0 var(--pimd-ink);
  color: var(--pimd-ink);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(11px, 3vw, 14px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0;
  text-align: center;
}

.ribbon-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--pimd-ink);
}

.ribbon-content small {
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 7px;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

@keyframes pending-stamp {
  50% {
    transform: rotate(3deg) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .whiteCard,
  .btn-save,
  .btn-trash,
  .whiteCard.pending .card-back > span {
    animation: none;
    transition: none;
  }
}

@media (forced-colors: active) {
  .whiteCard-wrapper::before,
  .whiteCard,
  .card-index,
  .card-back > span,
  .ribbon,
  .btn-save,
  .btn-trash {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }
}
</style>

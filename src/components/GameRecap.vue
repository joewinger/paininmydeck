<template>
  <section class="game-recap" aria-labelledby="game-recap-title">
    <span class="game-recap__tape game-recap__tape--left" aria-hidden="true" />
    <span class="game-recap__tape game-recap__tape--right" aria-hidden="true" />

    <header class="game-recap__header">
      <div>
        <p class="pimd-eyebrow">Full game receipt · {{ paddedRoundCount }} rounds</p>
        <h2 id="game-recap-title">The whole messy story</h2>
        <p class="game-recap__intro">
          Every point, every lead, and every answer the room decided to reward.
        </p>
      </div>

      <dl class="recap-facts" aria-label="Game summary">
        <div>
          <dt>Lead changes</dt>
          <dd>{{ recap.leadChanges }}</dd>
        </div>
        <div>
          <dt>Longest run</dt>
          <dd v-if="recap.longestStreak && recap.longestStreak.length > 1">
            {{ recap.longestStreak.displayName }} · {{ recap.longestStreak.length }} straight
          </dd>
          <dd v-else>No back-to-back wins</dd>
        </div>
        <div>
          <dt>{{ recap.finalLeaders.length > 1 ? 'Final high-score tie' : 'Final leader' }}</dt>
          <dd>{{ finalLeaderNames }}</dd>
        </div>
      </dl>
    </header>

    <section class="score-ledger" aria-labelledby="score-ledger-title">
      <div class="recap-section-heading">
        <div>
          <p class="pimd-eyebrow">Running total</p>
          <h3 id="score-ledger-title">How the score moved</h3>
        </div>
        <p>Each step is a round win. Scroll the receipt for long games.</p>
      </div>

      <div
        class="score-chart__viewport"
        tabindex="0"
        aria-label="Scrollable cumulative score chart"
      >
        <svg
          class="score-chart"
          :style="{ minWidth: `${chartMinWidth}px` }"
          viewBox="0 0 1000 292"
          role="img"
          aria-labelledby="score-chart-title score-chart-description"
        >
          <title id="score-chart-title">Cumulative score by round</title>
          <desc id="score-chart-description">{{ chartDescription }}</desc>

          <g class="score-chart__grid" aria-hidden="true">
            <g v-for="tick in scoreTickValues" :key="`score-${tick}`">
              <line x1="58" :y1="scoreY(tick)" x2="952" :y2="scoreY(tick)" />
              <text x="43" :y="scoreY(tick) + 4">{{ tick }}</text>
            </g>
            <g v-for="(round, index) in recap.rounds" :key="`round-${round.round}`">
              <line
                class="score-chart__round-line"
                :class="{ 'score-chart__round-line--labelled': shouldLabelRound(index) }"
                :x1="roundX(round.round)"
                y1="28"
                :x2="roundX(round.round)"
                y2="240"
              />
              <text
                v-if="shouldLabelRound(index)"
                class="score-chart__round-label"
                :x="roundX(round.round)"
                y="270"
              >
                R{{ round.round }}
              </text>
            </g>
          </g>

          <g aria-hidden="true">
            <path
              v-for="player in recap.players"
              :key="`outline-${player.playerId}`"
              class="score-chart__line score-chart__line--outline"
              :d="scorePath(player.scorePoints)"
              :stroke-dasharray="player.dashPattern || undefined"
            />
            <path
              v-for="player in recap.players"
              :key="player.playerId"
              class="score-chart__line"
              :d="scorePath(player.scorePoints)"
              :stroke="player.color"
              :stroke-dasharray="player.dashPattern || undefined"
            />
          </g>
        </svg>
      </div>

      <ul class="score-key" aria-label="Player chart key">
        <li v-for="player in recap.players" :key="player.playerId">
          <span class="score-key__identity">{{ player.identity }}</span>
          <svg viewBox="0 0 54 12" aria-hidden="true">
            <path
              d="M 2 6 H 52"
              :stroke="player.color"
              :stroke-dasharray="player.dashPattern || undefined"
            />
          </svg>
          <span class="score-key__name">{{ player.displayName }}</span>
          <strong>{{ player.finalPoints }} pt</strong>
        </li>
      </ul>

      <ul class="recap-visually-hidden">
        <li v-for="player in recap.players" :key="`data-${player.playerId}`">
          Player {{ player.identity }}, {{ player.displayName }}: cumulative scores
          {{ player.scorePoints.map((point) => `round ${point.round}, ${point.score}`).join('; ') }}.
          Final score {{ player.finalPoints }}.
        </li>
      </ul>
    </section>

    <section class="round-ledger" aria-labelledby="round-ledger-title">
      <div class="recap-section-heading">
        <div>
          <p class="pimd-eyebrow">Winning tickets</p>
          <h3 id="round-ledger-title">What took each point</h3>
        </div>
        <p>{{ recap.roundCount }} questionable decisions, in order.</p>
      </div>

      <ol
        class="round-timeline"
        :class="{ 'round-timeline--expanded': timelineExpanded }"
        tabindex="0"
        aria-label="Winning answers by round"
      >
        <li
          v-for="(round, index) in recap.rounds"
          :key="`${round.round}-${round.winningPlayerId ?? round.winningPlayerDisplayName}`"
          class="round-ticket"
          :class="{ 'round-ticket--collapsed': index >= MOBILE_VISIBLE_ROUNDS }"
        >
          <div class="round-ticket__meta">
            <span>Round {{ String(round.round).padStart(2, '0') }}</span>
          </div>
          <p class="round-ticket__question">
            <span>Q</span>
            {{ blankify(round.question) }}
          </p>
          <div class="round-ticket__winning-answer">
            <p
              class="round-ticket__answer"
              :class="{ 'round-ticket__answer--blank': round.winningAnswerBlank }"
            >
              <span>A</span>
              {{ round.winningAnswer }}
            </p>
            <p class="round-ticket__winner">
              Winner · #{{ winnerIdentity(round) }} · {{ round.winningPlayerDisplayName }}
            </p>
          </div>
          <p class="round-ticket__crowd">
            Crowd receipt · {{ round.winningAnswerApplause }} applause
          </p>
        </li>
      </ol>

      <button
        v-if="recap.roundCount > MOBILE_VISIBLE_ROUNDS"
        type="button"
        class="pimd-secondary-button round-timeline__toggle"
        :aria-expanded="timelineExpanded"
        @click="timelineExpanded = !timelineExpanded"
      >
        {{ timelineExpanded ? 'Show fewer rounds' : `Show all ${recap.roundCount} rounds` }}
      </button>
    </section>

    <footer class="game-recap__footer">
      <span>Receipt closed</span>
      <span aria-hidden="true">••••••••••••</span>
      <span>{{ recap.roundCount }} rounds verified</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PlayerSummary, RoundHistoryEntry } from '@/shared/protocol';
import { blankify } from '@/shared/protocol';
import {
  buildGameRecapModel,
  buildStepPath,
  scoreTicks,
  type RecapScorePoint,
} from './gameRecap';

const MOBILE_VISIBLE_ROUNDS = 3;
const CHART_LEFT = 58;
const CHART_RIGHT = 952;
const CHART_TOP = 28;
const CHART_BOTTOM = 240;

const props = defineProps<{
  leaderboard: PlayerSummary[];
  rounds: RoundHistoryEntry[];
}>();

const timelineExpanded = ref(false);
const recap = computed(() => buildGameRecapModel(props.leaderboard, props.rounds));
const lastRoundNumber = computed(() => recap.value.rounds.at(-1)?.round ?? 1);
const chartMinWidth = computed(() => Math.max(720, recap.value.roundCount * 72 + 170));
const scoreTickValues = computed(() => scoreTicks(recap.value.maxScore));
const roundLabelStep = computed(() => Math.max(1, Math.ceil(recap.value.roundCount / 10)));
const paddedRoundCount = computed(() => String(recap.value.roundCount).padStart(2, '0'));
const finalLeaderNames = computed(
  () => recap.value.finalLeaders.map((player) => player.displayName).join(' + ') || 'No score',
);
const chartDescription = computed(() =>
  recap.value.players
    .map(
      (player) =>
        `Player ${player.identity}, ${player.displayName}, finished with ${player.finalPoints} ${
          player.finalPoints === 1 ? 'point' : 'points'
        }`,
    )
    .join('. '),
);
const playersById = computed(
  () => new Map(recap.value.players.map((player) => [player.playerId, player])),
);
const playersByName = computed(
  () =>
    new Map(
      recap.value.players.map((player) => [
        player.displayName.trim().toLocaleLowerCase(),
        player,
      ]),
    ),
);

function roundX(round: number): number {
  return CHART_LEFT + (round / Math.max(1, lastRoundNumber.value)) * (CHART_RIGHT - CHART_LEFT);
}

function scoreY(score: number): number {
  return CHART_BOTTOM - (score / recap.value.maxScore) * (CHART_BOTTOM - CHART_TOP);
}

function scorePath(points: readonly RecapScorePoint[]): string {
  return buildStepPath(points, {
    left: CHART_LEFT,
    right: CHART_RIGHT,
    top: CHART_TOP,
    bottom: CHART_BOTTOM,
    firstRound: 0,
    lastRound: lastRoundNumber.value,
    maxScore: recap.value.maxScore,
  });
}

function shouldLabelRound(index: number): boolean {
  return index % roundLabelStep.value === 0 || index === recap.value.roundCount - 1;
}

function winnerIdentity(round: RoundHistoryEntry): number | string {
  const player =
    (round.winningPlayerId ? playersById.value.get(round.winningPlayerId) : undefined) ??
    playersByName.value.get(round.winningPlayerDisplayName.trim().toLocaleLowerCase());
  return player?.identity ?? '—';
}
</script>

<style scoped>
.game-recap {
  position: relative;
  display: grid;
  gap: 30px;
  width: min(100%, 1280px);
  margin-inline: auto;
  padding: clamp(28px, 5vw, 54px) clamp(16px, 4vw, 50px) 32px;
  border: 4px solid var(--pimd-ink);
  background-color: var(--pimd-paper);
  background-image:
    linear-gradient(rgb(87 169 191 / 13%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(87 169 191 / 13%) 1px, transparent 1px);
  background-size: 18px 18px;
  box-shadow: 10px 12px 0 var(--pimd-primary-dark);
  color: var(--pimd-ink);
}

.game-recap::before,
.game-recap::after {
  position: absolute;
  right: 12px;
  left: 12px;
  height: 8px;
  background: repeating-linear-gradient(
    90deg,
    var(--pimd-ink) 0 14px,
    transparent 14px 23px
  );
  content: '';
}

.game-recap::before {
  top: 12px;
}

.game-recap::after {
  bottom: 12px;
}

.game-recap__tape {
  position: absolute;
  z-index: 2;
  top: -14px;
  width: 82px;
  height: 28px;
  background: rgb(87 205 189 / 88%);
  clip-path: polygon(3% 12%, 99% 0, 95% 91%, 0 100%);
}

.game-recap__tape--left {
  left: 8%;
  transform: rotate(-5deg);
}

.game-recap__tape--right {
  right: 7%;
  transform: rotate(4deg);
  background: rgb(255 214 74 / 86%);
}

.game-recap__header {
  display: grid;
  gap: 22px;
  padding-bottom: 26px;
  border-bottom: 4px double var(--pimd-ink);
}

.game-recap__header h2,
.recap-section-heading h3 {
  margin: 0;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
}

.game-recap__header h2 {
  max-width: 14ch;
  margin-top: 9px;
  font-size: clamp(2.2rem, 6vw, 5.2rem);
  letter-spacing: -0.045em;
}

.game-recap__intro {
  max-width: 46ch;
  margin: 14px 0 0;
  color: var(--pimd-ink-soft);
  font-size: clamp(0.9rem, 2vw, 1.05rem);
  font-weight: 800;
  line-height: 1.45;
}

.recap-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-self: end;
  padding: 0;
  margin: 0;
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 5px 6px 0 var(--pimd-ink);
}

.recap-facts > div {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
  padding: 13px 14px;
}

.recap-facts > div + div {
  border-left: 3px solid var(--pimd-ink);
}

.recap-facts dt,
.recap-facts dd {
  margin: 0;
}

.recap-facts dt {
  font-family: 'Bungee', sans-serif;
  font-size: 0.58rem;
  font-weight: 400;
  line-height: 1.2;
  text-transform: uppercase;
}

.recap-facts dd {
  font-size: clamp(0.8rem, 2vw, 1rem);
  font-weight: 900;
  line-height: 1.25;
}

.score-ledger,
.round-ledger {
  display: grid;
  min-width: 0;
}

.score-ledger {
  gap: 18px;
}

.round-ledger {
  gap: 16px;
  padding-top: 28px;
  border-top: 3px dashed var(--pimd-ink);
}

.recap-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}

.recap-section-heading h3 {
  margin-top: 6px;
  font-size: clamp(1.25rem, 3.8vw, 2.2rem);
}

.recap-section-heading > p {
  max-width: 34ch;
  margin: 0;
  color: var(--pimd-ink-soft);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.35;
  text-align: right;
}

.score-chart__viewport {
  width: 100%;
  overflow-x: auto;
  border: 3px solid var(--pimd-ink);
  background:
    linear-gradient(rgb(255 250 240 / 92%), rgb(255 250 240 / 92%)),
    repeating-linear-gradient(90deg, transparent 0 33px, var(--pimd-grid) 33px 34px);
  box-shadow: inset 0 -5px 0 var(--pimd-paper-shadow);
  scrollbar-color: var(--pimd-primary) var(--pimd-paper-shadow);
}

.score-chart__viewport:focus-visible {
  outline: 3px solid var(--pimd-ink);
  outline-offset: 4px;
  box-shadow: var(--pimd-focus);
}

.score-chart {
  display: block;
  width: 100%;
  height: auto;
  max-height: 330px;
}

.score-chart__grid line {
  stroke: var(--pimd-paper-shadow);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.score-chart__grid text {
  fill: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 13px;
  font-weight: 400;
  text-anchor: end;
}

.score-chart__grid .score-chart__round-line {
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.score-chart__grid .score-chart__round-line--labelled {
  stroke: var(--pimd-meta);
  stroke-width: 2;
}

.score-chart__grid .score-chart__round-label {
  font-size: 11px;
  text-anchor: middle;
}

.score-chart__line {
  fill: none;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 4;
  vector-effect: non-scaling-stroke;
}

.score-chart__line--outline {
  stroke: var(--pimd-ink);
  stroke-width: 8;
}

.score-key {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 9px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.score-key li {
  display: grid;
  grid-template-columns: 30px 54px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 8px 10px;
  border: 2px solid var(--pimd-ink);
  background: var(--pimd-paper);
}

.score-key__identity {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  font-family: 'Bungee', sans-serif;
  font-size: 0.72rem;
}

.score-key svg {
  width: 54px;
  height: 12px;
}

.score-key path {
  fill: none;
  stroke-linecap: square;
  stroke-width: 4;
  vector-effect: non-scaling-stroke;
}

.score-key__name {
  overflow: hidden;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-key strong {
  font-family: 'Bungee', sans-serif;
  font-size: 0.72rem;
  font-weight: 400;
  white-space: nowrap;
}

.round-timeline {
  display: grid;
  grid-auto-columns: minmax(230px, 1fr);
  grid-auto-flow: column;
  gap: 14px;
  overflow-x: auto;
  padding: 3px 3px 14px;
  margin: 0;
  scroll-snap-type: x proximity;
  scrollbar-color: var(--pimd-primary) var(--pimd-paper-shadow);
  list-style: none;
}

.round-ticket {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr 1fr auto;
  gap: 10px;
  min-width: 0;
  min-height: 238px;
  padding: 13px;
  transform: rotate(0.18deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-primary);
  scroll-snap-align: start;
}

.round-ticket:nth-child(even) {
  transform: rotate(-0.18deg);
  box-shadow: 4px 5px 0 var(--pimd-meta);
}

.round-ticket__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 9px;
  border-bottom: 2px dashed var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.55rem;
  line-height: 1.2;
  text-transform: uppercase;
}

.round-ticket__question,
.round-ticket__answer,
.round-ticket__crowd {
  margin: 0;
}

.round-ticket__question,
.round-ticket__answer {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 7px;
  align-content: start;
  font-size: 0.82rem;
  font-weight: 850;
  line-height: 1.32;
}

.round-ticket__answer {
  font-size: 0.9rem;
}

.round-ticket__winning-answer {
  min-width: 0;
}

.round-ticket__answer--blank {
  font-family: 'Nanum Pen Script', 'Inter', sans-serif;
  font-size: 1.45rem;
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: 0;
}

.round-ticket__winner {
  margin: 8px 0 0 29px;
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 0.53rem;
  line-height: 1.25;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.round-ticket__question > span,
.round-ticket__answer > span {
  display: grid;
  place-content: center;
  align-self: start;
  width: 21px;
  height: 21px;
  border: 2px solid var(--pimd-ink);
  background: var(--pimd-ink);
  color: var(--pimd-paper);
  font-family: 'Bungee', sans-serif;
  font-size: 0.62rem;
  line-height: 1;
}

.round-ticket__answer > span {
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.round-ticket__crowd {
  padding-top: 8px;
  border-top: 2px solid var(--pimd-ink);
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 0.53rem;
  line-height: 1.25;
  text-transform: uppercase;
}

.round-timeline__toggle {
  display: none;
}

.game-recap__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 17px;
  border-top: 4px double var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.55rem;
  text-transform: uppercase;
}

.recap-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 900px) {
  .game-recap__header {
    grid-template-columns: minmax(300px, 0.9fr) minmax(500px, 1.1fr);
    align-items: end;
  }

  .round-timeline {
    grid-auto-columns: minmax(230px, calc((100% - 42px) / 4));
  }
}

@media (max-width: 640px) {
  .game-recap {
    gap: 24px;
    padding-inline: 14px;
    box-shadow: 0 9px 0 var(--pimd-primary-dark);
  }

  .game-recap__header h2 {
    font-size: clamp(2.25rem, 14vw, 3.6rem);
  }

  .recap-facts {
    grid-template-columns: 1fr;
  }

  .recap-facts > div + div {
    border-top: 3px solid var(--pimd-ink);
    border-left: 0;
  }

  .recap-section-heading {
    display: grid;
    gap: 8px;
  }

  .recap-section-heading > p {
    text-align: left;
  }

  .score-chart__viewport {
    box-shadow: inset -5px 0 0 var(--pimd-paper-shadow);
  }

  .score-key {
    grid-template-columns: 1fr;
  }

  .round-timeline {
    grid-auto-flow: row;
    grid-template-columns: 1fr;
    overflow: visible;
    padding-bottom: 3px;
  }

  .round-ticket {
    min-height: 0;
  }

  .round-ticket--collapsed {
    display: none;
  }

  .round-timeline--expanded .round-ticket--collapsed {
    display: grid;
  }

  .round-timeline__toggle {
    display: inline-flex;
    width: 100%;
  }

  .game-recap__footer span:nth-child(2) {
    display: none;
  }
}

@media (forced-colors: active) {
  .game-recap,
  .recap-facts,
  .score-chart__viewport,
  .score-key li,
  .round-ticket {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }

  .score-chart__line,
  .score-key path {
    stroke: CanvasText;
  }
}
</style>

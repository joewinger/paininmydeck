<template>
  <div id="tv" class="pimd-screen tv-screen" :data-phase="game.phase.toLowerCase()">
    <header class="tv-header">
      <product-mark variant="compact" />

      <div class="tv-header__room">
        <span>Room</span>
        <strong>{{ game.roomId }}</strong>
      </div>

      <div class="tv-header__status" :data-connection="game.connectionState">
        <span aria-hidden="true"></span>
        <strong>{{ connectionLabel }}</strong>
      </div>
    </header>

    <div class="tv-dashboard">
      <main class="tv-stage" aria-live="polite">
        <section v-if="game.phase === 'LOBBY'" class="tv-lobby" aria-labelledby="tv-lobby-title">
          <room-qr-code :room-id="game.roomId ?? ''" :size="300" />

          <div class="tv-lobby__copy">
            <p class="pimd-eyebrow">Pass this around the room</p>
            <h1 id="tv-lobby-title">Join the game</h1>
            <strong class="tv-room-code">{{ game.roomId }}</strong>
            <p>
              {{ game.users.length }} of 8 players
              {{ game.users.length === 1 ? 'is' : 'are' }} checked in.
            </p>
            <div class="tv-waiting-stamp">Waiting for the host</div>
          </div>
        </section>

        <template v-else-if="isPlaying">
          <section class="tv-round" :aria-labelledby="'tv-phase-title'">
            <dl class="tv-round__meta" aria-label="Round status">
              <div>
                <dt>Round</dt>
                <dd>{{ formattedRound }}</dd>
              </div>
              <div>
                <dt>Card Czar</dt>
                <dd>{{ game.czar?.displayName ?? '—' }}</dd>
              </div>
              <div>
                <dt>Answers in</dt>
                <dd>{{ submittedCount }} / {{ expectedAnswerCount }}</dd>
              </div>
            </dl>

            <article class="tv-question">
              <span class="pimd-tape tv-question__tape" aria-hidden="true"></span>
              <div class="tv-question__heading">
                <span>Question card</span>
                <strong id="tv-phase-title">{{ phaseHeading }}</strong>
              </div>
              <p>{{ blankify(game.turn.questionCard) }}</p>
            </article>

            <div v-if="game.phase === 'COLLECTING'" class="tv-collecting">
              <p>Choose an answer on your phone.</p>
              <div class="tv-card-grid tv-card-grid--backs" aria-label="Submitted answers">
                <article
                  v-for="index in expectedAnswerCount"
                  :key="index"
                  class="tv-answer-card tv-answer-card--back"
                  :class="{ 'tv-answer-card--submitted': index <= submittedCount }"
                  :aria-label="
                    index <= submittedCount
                      ? `Answer ${index} submitted`
                      : `Waiting for answer ${index}`
                  "
                >
                  <span>{{ index <= submittedCount ? 'Card in' : 'Waiting' }}</span>
                </article>
              </div>
            </div>

            <div v-else-if="game.phase === 'JUDGING'" class="tv-judging">
              <p>{{ game.czar?.displayName ?? 'The Card Czar' }} is choosing on their phone.</p>
              <div class="tv-card-grid" aria-label="Answers for the Card Czar">
                <article
                  v-for="(card, index) in game.turn.playedCards"
                  :key="card.id"
                  class="tv-answer-card"
                >
                  <span class="tv-answer-card__number">{{ formatCardNumber(index) }}</span>
                  <strong>{{ card.text }}</strong>
                </article>
              </div>
            </div>

            <div v-else class="tv-reveal">
              <p class="pimd-eyebrow">Round winner</p>
              <article v-if="game.turn.winningCard" class="tv-winning-card">
                <strong>{{ game.turn.winningCard.text }}</strong>
                <span>
                  Played by
                  <b>{{ game.turn.winningCard.playedByDisplayName }}</b>
                </span>
              </article>
              <p v-else>The winning card is coming into focus…</p>
            </div>
          </section>

          <tv-latest-round-receipt
            v-if="latestRound && game.phase !== 'REVEAL'"
            :round="latestRound"
          />
        </template>

        <section v-else class="tv-finished" aria-labelledby="tv-finished-title">
          <p class="pimd-eyebrow">
            {{ game.phase === 'CANCELLED' ? 'Game ended' : 'Final score' }}
          </p>
          <h1 id="tv-finished-title">
            <template v-if="game.phase === 'CANCELLED'">Game cancelled</template>
            <template v-else>
              <span>{{ game.room.finalRecord?.winner?.displayName ?? 'Someone' }}</span>
              won!
            </template>
          </h1>
          <p>
            {{
              game.phase === 'CANCELLED'
                ? 'No champion was crowned, but the receipts remain.'
                : `The game lasted ${game.room.finalRecord?.rounds ?? game.turn.round} rounds.`
            }}
          </p>
          <tv-latest-round-receipt v-if="latestRound" :round="latestRound" />
        </section>
      </main>

      <aside class="tv-rail" aria-label="Room activity">
        <section class="tv-panel tv-leaderboard" aria-labelledby="tv-leaderboard-title">
          <header class="tv-panel__heading">
            <span>Live room</span>
            <h2 id="tv-leaderboard-title">
              {{ game.phase === 'LOBBY' ? 'Players' : 'Leaderboard' }}
            </h2>
          </header>

          <ol>
            <li
              v-for="player in leaderboardPlayers"
              :key="player.playerId"
              :class="{
                'tv-player--czar': game.turn.czarPlayerId === player.playerId,
                'tv-player--submitted': game.playedPlayerIds.includes(player.playerId),
                'tv-player--offline': !player.connected,
              }"
              :style="{ '--player-color': player.colorSet[0] }"
            >
              <span class="tv-player__rank" :aria-label="`Rank ${rankFor(player.points)}`">
                {{ rankFor(player.points) }}
              </span>
              <span class="tv-player__name">
                <strong>{{ player.displayName }}</strong>
                <small>{{ playerStatus(player) }}</small>
              </span>
              <span class="tv-player__points">
                <strong>{{ player.points }}</strong>
                <small>pts</small>
              </span>
            </li>
          </ol>
        </section>

        <section class="tv-panel tv-chat" aria-labelledby="tv-chat-title">
          <header class="tv-panel__heading">
            <span>From the table</span>
            <h2 id="tv-chat-title">Chat</h2>
          </header>

          <div class="tv-chat__messages" role="log" aria-live="polite" aria-label="Room chat">
            <p v-if="visibleChatMessages.length === 0" class="tv-chat__empty">
              The room is quiet—for now.
            </p>
            <chat-message
              v-for="(message, index) in visibleChatMessages"
              v-else
              :key="message.id"
              :message-obj="message"
              :last-in-thread="
                index === 0 ||
                visibleChatMessages[index - 1].senderDisplayName !== message.senderDisplayName
              "
            />
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChatMessage from '@/components/StatusMenu/content/Chat/ChatMessage.vue';
import ProductMark from '@/components/ProductMark.vue';
import RoomQrCode from '@/components/RoomQrCode.vue';
import TvLatestRoundReceipt from '@/components/TvLatestRoundReceipt.vue';
import { blankify, type PlayerSummary } from '@/shared/protocol';
import { useGameStore } from '@/stores/game';

const game = useGameStore();
const isPlaying = computed(() => ['COLLECTING', 'JUDGING', 'REVEAL'].includes(game.phase));
const expectedAnswerCount = computed(() => Math.max(game.users.length - 1, 0));
const submittedCount = computed(() => game.playedPlayerIds.length);
const formattedRound = computed(() => String(game.turn.round || 1).padStart(2, '0'));
const latestRound = computed(() => game.roundHistory.at(-1) ?? null);
const visibleChatMessages = computed(() => game.chatMessages.slice(-5));
const leaderboardPlayers = computed(() => {
  const finalPlayers = game.room.finalRecord?.leaderboard;
  return finalPlayers ? [...finalPlayers].sort((a, b) => b.points - a.points) : game.sortedUsers;
});
const pointRanks = computed(() => [
  ...new Set(leaderboardPlayers.value.map((player) => player.points)),
]);

const connectionLabel = computed(() => {
  if (game.connectionState === 'connecting') return 'Connecting';
  if (game.connectionState === 'reconnecting') return 'Reconnecting';
  if (game.connectionState === 'open') return 'Live';
  return 'Offline';
});

const phaseHeading = computed(() => {
  if (game.phase === 'COLLECTING') return 'Cards are coming in';
  if (game.phase === 'JUDGING') return 'Time to judge';
  return 'The room has spoken';
});

function formatCardNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function rankFor(points: number): number {
  return pointRanks.value.indexOf(points) + 1;
}

function playerStatus(player: PlayerSummary): string {
  if (!player.connected) return 'Reconnecting';
  if (game.phase === 'LOBBY') return 'At the table';
  if (['FINISHED', 'CANCELLED'].includes(game.phase)) return 'Final score';
  if (game.turn.czarPlayerId === player.playerId) return 'Card Czar';
  if (game.playedPlayerIds.includes(player.playerId)) return 'Card in';
  return 'Choosing…';
}

</script>

<style scoped>
.tv-screen {
  min-height: 100svh;
  overflow: visible;
}

.tv-header {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  min-height: 68px;
  padding: 8px clamp(14px, 2.4vw, 36px);
  border-bottom: 4px solid var(--pimd-ink);
  background:
    linear-gradient(90deg, rgb(255 255 255 / 7%) 1px, transparent 1px) 0 0 / 18px 100%,
    linear-gradient(
      175deg,
      var(--pimd-wood) 0 49%,
      var(--pimd-wood-dark) 50% 54%,
      var(--pimd-wood) 55% 100%
    );
  box-shadow: 0 5px 0 rgb(45 37 64 / 16%);
}

.tv-header .pimd-product-mark {
  --pimd-mark-card-text: var(--pimd-ink);

  justify-self: start;
  padding: 7px 11px 6px;
  transform: rotate(-1deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 3px 4px 0 var(--pimd-ink);
}

.tv-header__room {
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 7px 13px 6px;
  transform: rotate(0.5deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 3px 4px 0 var(--pimd-ink);
  color: var(--pimd-ink);
  text-transform: uppercase;
}

.tv-header__room span,
.tv-header__status strong {
  font-family: 'Bungee', sans-serif;
  font-size: clamp(8px, 0.8vw, 11px);
  font-weight: 400;
}

.tv-header__room strong {
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: clamp(17px, 1.8vw, 25px);
  letter-spacing: 0.1em;
}

.tv-header__status {
  display: inline-flex;
  justify-self: end;
  align-items: center;
  gap: 8px;
  color: var(--pimd-paper);
  text-transform: uppercase;
}

.tv-header__status > span {
  width: 13px;
  height: 13px;
  border: 2px solid var(--pimd-ink);
  border-radius: 50%;
  background: var(--pimd-highlight);
  box-shadow: 1px 2px 0 var(--pimd-ink);
}

.tv-header__status[data-connection='open'] > span {
  background: var(--pimd-secondary);
}

.tv-header__status[data-connection='reconnecting'] > span,
.tv-header__status[data-connection='connecting'] > span {
  animation: tv-connection-pulse 1.2s ease-in-out infinite;
}

.tv-dashboard {
  display: grid;
  gap: 18px;
  width: min(100%, 1800px);
  min-height: calc(100svh - 68px);
  margin-inline: auto;
  padding: clamp(16px, 2vw, 30px);
}

.tv-stage,
.tv-panel {
  min-width: 0;
  border: 4px solid var(--pimd-ink);
  background-color: var(--pimd-paper);
  background-image:
    linear-gradient(var(--pimd-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--pimd-grid) 1px, transparent 1px);
  background-size: 18px 18px;
  box-shadow: 7px 8px 0 var(--pimd-primary-dark);
}

.tv-stage {
  display: grid;
  align-content: start;
  gap: 15px;
  padding: clamp(18px, 2.2vw, 34px);
}

.tv-lobby {
  display: grid;
  align-items: center;
  justify-items: center;
  gap: clamp(24px, 4vw, 58px);
  width: 100%;
  min-height: 100%;
}

.tv-lobby__copy {
  display: grid;
  justify-items: start;
  min-width: 0;
}

.tv-lobby__copy h1,
.tv-finished h1 {
  margin: 13px 0 15px;
  color: var(--pimd-primary-dark);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(38px, 5.4vw, 86px);
  font-weight: 400;
  line-height: 0.88;
  letter-spacing: -0.045em;
  text-transform: uppercase;
}

.tv-room-code {
  color: var(--pimd-ink);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: clamp(48px, 7vw, 110px);
  letter-spacing: 0.08em;
  line-height: 1;
}

.tv-lobby__copy > p:not(.pimd-eyebrow),
.tv-finished > p:not(.pimd-eyebrow) {
  max-width: 34ch;
  margin: 16px 0;
  color: var(--pimd-ink-soft);
  font-size: clamp(16px, 1.5vw, 22px);
  font-weight: 800;
  line-height: 1.35;
}

.tv-waiting-stamp {
  margin-top: 8px;
  padding: 10px 13px 8px;
  transform: rotate(-1.5deg);
  border: 3px solid var(--pimd-primary-dark);
  color: var(--pimd-primary-dark);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(10px, 1vw, 15px);
  line-height: 1;
  text-transform: uppercase;
}

.tv-round {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 0;
}

.tv-round__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.tv-round__meta > div {
  min-width: 0;
  padding: 7px 10px 6px;
  text-align: center;
}

.tv-round__meta > div + div {
  border-left: 2px solid var(--pimd-ink);
}

.tv-round__meta dt,
.tv-round__meta dd {
  margin: 0;
}

.tv-round__meta dt {
  font-family: 'Bungee', sans-serif;
  font-size: clamp(7px, 0.6vw, 10px);
  line-height: 1;
  text-transform: uppercase;
}

.tv-round__meta dd {
  margin-top: 4px;
  overflow: hidden;
  font-size: clamp(13px, 1.2vw, 19px);
  font-weight: 900;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tv-question {
  position: relative;
  display: grid;
  gap: 9px;
  min-height: 126px;
  padding: clamp(20px, 2vw, 29px) clamp(18px, 2vw, 30px) 19px;
  transform: rotate(-0.2deg);
  border: 4px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 5px 6px 0 var(--pimd-meta);
}

.tv-question__tape {
  top: -9px;
  right: 11%;
  width: 74px;
  transform: rotate(6deg);
}

.tv-question__heading {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(8px, 0.7vw, 11px);
  line-height: 1;
  text-transform: uppercase;
}

.tv-question__heading strong {
  color: var(--pimd-primary-dark);
  font-weight: 400;
  text-align: right;
}

.tv-question > p {
  align-self: center;
  margin: 0;
  color: var(--pimd-ink);
  font-size: clamp(27px, 3vw, 49px);
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.tv-collecting,
.tv-judging,
.tv-reveal {
  display: grid;
  align-content: start;
  gap: 11px;
  min-height: 0;
}

.tv-collecting > p,
.tv-judging > p,
.tv-reveal > p:not(.pimd-eyebrow) {
  margin: 0;
  color: var(--pimd-ink-soft);
  font-size: clamp(14px, 1.2vw, 19px);
  font-weight: 800;
  text-align: center;
}

.tv-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: clamp(10px, 1.1vw, 17px);
  min-height: 0;
}

.tv-card-grid--backs {
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
}

.tv-answer-card {
  position: relative;
  display: grid;
  align-content: center;
  min-width: 0;
  min-height: 132px;
  max-height: 190px;
  padding: 23px 13px 14px;
  transform: rotate(-0.45deg);
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 4px 5px 0 var(--pimd-meta);
  color: var(--pimd-ink);
}

.tv-answer-card:nth-child(even) {
  transform: rotate(0.45deg);
  box-shadow: 4px 5px 0 var(--pimd-secondary);
}

.tv-answer-card strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(14px, 1.35vw, 22px);
  font-weight: 850;
  line-height: 1.12;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.tv-answer-card__number {
  position: absolute;
  top: 8px;
  left: 10px;
  color: var(--pimd-ink-soft);
  font-family: 'Bungee', sans-serif;
  font-size: 9px;
}

.tv-answer-card--back {
  min-height: 112px;
  padding: 12px;
  place-content: center;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 8%) 25%, transparent 25%) 0 0 / 18px 18px,
    var(--pimd-primary-dark);
  box-shadow: 4px 5px 0 var(--pimd-paper-shadow);
  color: var(--pimd-paper);
  opacity: 0.52;
}

.tv-answer-card--back span {
  font-family: 'Bungee', sans-serif;
  font-size: clamp(9px, 0.8vw, 12px);
  text-align: center;
  text-transform: uppercase;
}

.tv-answer-card--submitted {
  box-shadow: 4px 5px 0 var(--pimd-highlight);
  opacity: 1;
}

.tv-reveal {
  justify-items: center;
  padding-top: 5px;
}

.tv-winning-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: clamp(20px, 4vw, 64px);
  width: min(100%, 720px);
  min-height: 180px;
  padding: clamp(24px, 3vw, 42px);
  transform: rotate(-0.6deg);
  border: 4px solid var(--pimd-ink);
  background: var(--pimd-highlight);
  box-shadow: 8px 9px 0 var(--pimd-primary-dark);
  color: var(--pimd-ink);
}

.tv-winning-card > strong {
  font-size: clamp(27px, 3vw, 48px);
  line-height: 1.02;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.tv-winning-card > span {
  display: grid;
  gap: 4px;
  padding: 9px 11px 8px;
  transform: rotate(2deg);
  background: var(--pimd-meta);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(8px, 0.8vw, 11px);
  line-height: 1;
  text-transform: uppercase;
}

.tv-winning-card b {
  font-size: 1.35em;
  font-weight: 400;
}

.tv-finished {
  display: grid;
  align-content: center;
  justify-items: start;
  min-height: 100%;
  padding: clamp(10px, 3vw, 45px);
}

.tv-finished h1 {
  max-width: 12ch;
  font-size: clamp(52px, 7vw, 116px);
}

.tv-finished h1 span {
  display: block;
  max-width: 10ch;
  color: var(--pimd-ink);
  font-size: 0.58em;
  overflow-wrap: anywhere;
}

.tv-finished :deep(.tv-latest-round) {
  width: 100%;
  margin-top: 20px;
}

.tv-rail {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.tv-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  box-shadow: 7px 8px 0 var(--pimd-meta);
}

.tv-panel__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 9px;
  border-bottom: 3px solid var(--pimd-ink);
  color: var(--pimd-ink);
}

.tv-panel__heading > span {
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  line-height: 1;
  text-transform: uppercase;
}

.tv-panel__heading h2 {
  margin: 0;
  color: var(--pimd-primary-dark);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(15px, 1.3vw, 21px);
  font-weight: 400;
  line-height: 1;
  text-align: right;
  text-transform: uppercase;
}

.tv-leaderboard ol {
  display: grid;
  align-content: start;
  gap: 4px;
  margin: 7px 0 0;
  padding: 0;
  list-style: none;
}

.tv-leaderboard li {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 31px;
  padding: 2px 6px 2px 2px;
  border: 2px solid var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 3px 3px 0 var(--player-color);
  color: var(--pimd-ink);
}

.tv-leaderboard li::before {
  position: absolute;
  top: -2px;
  right: 46px;
  width: 28px;
  height: 6px;
  transform: rotate(2deg);
  background: transparent;
  content: '';
}

.tv-leaderboard li.tv-player--czar::before {
  background: var(--pimd-meta);
}

.tv-leaderboard li.tv-player--submitted::before {
  background: var(--pimd-highlight);
}

.tv-leaderboard li.tv-player--offline {
  border-style: dashed;
  opacity: 0.68;
}

.tv-player__rank {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  background: var(--pimd-ink);
  color: var(--pimd-paper);
  font-family: 'Bungee', sans-serif;
  font-size: 11px;
}

.tv-player__name {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  min-width: 0;
  gap: 5px;
}

.tv-player__name strong {
  overflow: hidden;
  font-size: clamp(12px, 1vw, 16px);
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tv-player__name small,
.tv-player__points small {
  color: var(--pimd-ink-soft);
  font-size: 7px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.tv-player__points {
  display: grid;
  justify-items: end;
  min-width: 31px;
}

.tv-player__points strong {
  font-family: 'Bungee', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1;
}

.tv-chat {
  --font-size: clamp(0.72rem, 0.8vw, 0.9rem);
}

.tv-chat__messages {
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  padding: 9px 2px 2px;
  overflow: hidden;
}

.tv-chat__empty {
  align-self: center;
  margin: auto;
  color: var(--pimd-ink-soft);
  font-weight: 800;
  text-align: center;
}

.tv-chat :deep(.chatMessage) {
  max-width: 100%;
  padding: 6px 8px 7px;
  box-shadow: 2px 2px 0 var(--pimd-primary);
}

.tv-chat :deep(.chatMessage .message) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

@keyframes tv-connection-pulse {
  50% {
    opacity: 0.45;
    transform: scale(0.72);
  }
}

@media (min-width: 760px) {
  .tv-lobby {
    grid-template-columns: minmax(280px, 0.8fr) minmax(300px, 1fr);
  }

  .tv-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) and (min-height: 680px) {
  .tv-screen {
    height: 100svh;
    overflow: hidden;
  }

  .tv-dashboard {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 29vw);
    height: calc(100svh - 68px);
    min-height: 0;
  }

  .tv-stage {
    grid-template-rows: minmax(0, 1fr) auto;
    min-height: 0;
    overflow: hidden;
  }

  .tv-lobby,
  .tv-finished {
    grid-row: 1 / -1;
  }

  .tv-rail {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(365px, 1.65fr) minmax(170px, 0.65fr);
    min-height: 0;
  }
}

@media (max-width: 759px) {
  .tv-header {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .tv-header .pimd-product-mark {
    display: none;
  }

  .tv-header__room {
    justify-self: start;
  }

  .tv-lobby__copy {
    justify-items: center;
    text-align: center;
  }

  .tv-room-code {
    font-size: clamp(48px, 18vw, 82px);
  }

  .tv-round__meta {
    grid-template-columns: 0.65fr 1fr 0.85fr;
  }

  .tv-question__heading,
  .tv-winning-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .tv-question__heading {
    display: grid;
  }

  .tv-question__heading strong {
    text-align: left;
  }

  .tv-winning-card > span {
    justify-self: start;
  }

}

@media (prefers-reduced-motion: reduce) {
  .tv-header__status > span {
    animation: none;
  }
}

@media (forced-colors: active) {
  .tv-header,
  .tv-stage,
  .tv-panel,
  .tv-question,
  .tv-answer-card,
  .tv-winning-card,
  .tv-leaderboard li {
    border-color: CanvasText;
    background: Canvas;
    box-shadow: none;
    color: CanvasText;
  }
}
</style>

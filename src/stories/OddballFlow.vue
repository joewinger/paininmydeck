<template>
  <main class="oddball-stage oddball-flow-stage">
    <section class="oddball-flow-frame" :class="`oddball-flow-frame--${screen}`">
      <header class="oddball-flow-clubhouse">
        <div class="oddball-flow-club-badge" aria-label="Oddball Social Club">
          <span>Oddball</span><span>Social</span><span>Club</span>
        </div>

        <div class="oddball-flow-room-slip">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--header" aria-hidden="true"></span>
          <p>Room</p>
          <strong>{{ roomCode }}</strong>
        </div>

        <div class="oddball-flow-phase-card">
          <span>{{ screenMeta.index }}</span>
          <strong>{{ screenMeta.label }}</strong>
          <small>{{ screenMeta.detail }}</small>
        </div>
      </header>

      <div v-if="screen === 'profile'" class="oddball-flow-profile">
        <article class="oddball-flow-paper oddball-flow-profile-intro">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--intro" aria-hidden="true"></span>
          <p class="oddball-flow-eyebrow">New member card / Room {{ roomCode }}</p>
          <h1 id="oddball-flow-profile-title">Pick your club name</h1>
          <p>
            Nothing formal. We just need something to blame when the answers get weird.
          </p>
          <div class="oddball-flow-scribble" aria-hidden="true">Good company → bad ideas</div>
        </article>

        <form
          class="oddball-flow-paper oddball-flow-profile-form"
          aria-labelledby="oddball-flow-profile-title"
          @submit.prevent="saveProfile"
        >
          <div class="oddball-flow-field">
            <label for="oddball-flow-name">Call sign</label>
            <input
              id="oddball-flow-name"
              v-model="profileName"
              type="text"
              maxlength="12"
              autocomplete="nickname"
              :aria-invalid="profileInvalid"
              aria-describedby="oddball-flow-name-help oddball-flow-profile-feedback"
              placeholder="What should we call you?"
            />
            <small id="oddball-flow-name-help">Up to 12 characters. Future-you has to recognize it.</small>
          </div>

          <fieldset class="oddball-flow-color-picker">
            <legend>Pick a badge color</legend>
            <div role="radiogroup" aria-label="Badge color">
              <button
                v-for="badge in badges"
                :key="badge.id"
                type="button"
                role="radio"
                :aria-label="badge.name"
                :aria-checked="selectedBadge === badge.id"
                :style="{ '--oddball-flow-accent': badge.color }"
                @click="selectedBadge = badge.id"
              >
                <span aria-hidden="true">✱</span>
              </button>
            </div>
          </fieldset>

          <p
            id="oddball-flow-profile-feedback"
            class="oddball-flow-feedback"
            role="status"
            aria-live="polite"
          >
            {{ profileMessage }}
          </p>

          <button class="oddball-flow-primary-button" type="submit">Take my seat</button>
        </form>

        <aside class="oddball-flow-paper oddball-flow-members" aria-labelledby="oddball-flow-members-title">
          <p class="oddball-flow-eyebrow">Already causing trouble</p>
          <h2 id="oddball-flow-members-title">At the table</h2>
          <ul>
            <li v-for="player in players.slice(0, 3)" :key="player.name">
              <i :style="{ background: player.color }" aria-hidden="true"></i>
              <strong>{{ player.name }}</strong>
              <small>{{ player.host ? 'HOST' : 'READY' }}</small>
            </li>
          </ul>
        </aside>
      </div>

      <div v-else-if="screen === 'lobby'" class="oddball-flow-lobby">
        <article class="oddball-flow-paper oddball-flow-room-poster">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--room" aria-hidden="true"></span>
          <p class="oddball-flow-eyebrow">Pin this where everyone can see it</p>
          <h1><small>Room</small>{{ roomCode }}</h1>
          <p>Four humans found. Zero good decisions required.</p>
          <span class="oddball-flow-stamp" aria-hidden="true">Host copy</span>
        </article>

        <section class="oddball-flow-roster" aria-labelledby="oddball-flow-roster-title">
          <div class="oddball-flow-section-label">
            <span aria-hidden="true">››</span>
            <h2 id="oddball-flow-roster-title">At the table</h2>
            <span aria-hidden="true">‹‹</span>
          </div>
          <ol>
            <li
              v-for="(player, index) in players"
              :key="player.name"
              class="oddball-flow-member-card"
              :style="{ '--oddball-flow-accent': player.color }"
            >
              <span>0{{ index + 1 }}</span>
              <strong>{{ player.name }}</strong>
              <small>{{ player.host ? 'HOUSE HOST' : 'SIGNAL CLEAN' }}</small>
            </li>
          </ol>
        </section>

        <aside class="oddball-flow-host-controls">
          <section class="oddball-flow-paper oddball-flow-rule-sheet">
            <p class="oddball-flow-eyebrow">House rules / penciled in</p>
            <h2>Tonight’s setup</h2>
            <dl>
              <div><dt>Cards each</dt><dd>7</dd></div>
              <div><dt>First to</dt><dd>10</dd></div>
              <div><dt>Redraws</dt><dd>4</dd></div>
              <div><dt>Family mode</dt><dd>Off</dd></div>
            </dl>
            <button type="button" @click="lobbyMessage = 'Rule editor opened for the host.'">
              Change the rules
            </button>
          </section>

          <p class="oddball-flow-feedback" role="status" aria-live="polite">
            {{ lobbyMessage }}
          </p>
          <button class="oddball-flow-primary-button" type="button" @click="startGame">
            Start the game
          </button>
        </aside>
      </div>

      <div v-else-if="screen === 'player'" class="oddball-flow-game">
        <article class="oddball-flow-paper oddball-flow-question-sheet">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--question" aria-hidden="true"></span>
          <div>
            <p>Round 03 / Alex is judging</p>
            <small>Question card</small>
          </div>
          <h1 id="oddball-flow-player-question">My five-year plan mostly involves</h1>
          <span class="oddball-flow-blank-line" aria-hidden="true"></span>
        </article>

        <section class="oddball-flow-hand" aria-labelledby="oddball-flow-hand-title">
          <div class="oddball-flow-section-label">
            <span aria-hidden="true">››</span>
            <h2 id="oddball-flow-hand-title">Pick one from your hand</h2>
            <span aria-hidden="true">‹‹</span>
          </div>
          <ol class="oddball-flow-card-grid">
            <li
              v-for="(answer, index) in playerAnswers"
              :key="answer.id"
              :style="{ '--oddball-flow-accent': answer.color }"
            >
              <button
                class="oddball-flow-answer-card"
                :class="{
                  'oddball-flow-answer-card--selected': selectedAnswerId === answer.id,
                  'oddball-flow-answer-card--blank': answer.blank,
                }"
                type="button"
                :aria-label="`Select answer: ${answer.text}`"
                :aria-pressed="selectedAnswerId === answer.id"
                :disabled="answerSubmitted"
                @click="selectAnswer(answer.id)"
              >
                <span aria-hidden="true">{{ index + 1 }}</span>
                <strong>{{ answer.text }}</strong>
                <small>{{ answer.blank ? 'WRITE-IN' : 'ANSWER CARD' }}</small>
              </button>
            </li>
          </ol>
        </section>

        <aside class="oddball-flow-paper oddball-flow-play-slip">
          <p class="oddball-flow-eyebrow">Your move / Rowan</p>
          <h2>{{ answerSubmitted ? 'Card is in' : selectedAnswerId ? 'Good pick?' : 'Choose a card' }}</h2>
          <p class="oddball-flow-feedback" role="status" aria-live="polite">
            {{ answerMessage }}
          </p>
          <dl>
            <div><dt>Played</dt><dd>2 / 3</dd></div>
            <div><dt>Redraws</dt><dd>3 left</dd></div>
          </dl>
          <button
            class="oddball-flow-primary-button"
            type="button"
            :disabled="!selectedAnswerId || answerSubmitted"
            @click="submitAnswer"
          >
            {{ answerSubmitted ? 'Card is in' : 'Submit this card' }}
          </button>
        </aside>
      </div>

      <div v-else-if="screen === 'waiting'" class="oddball-flow-waiting">
        <article class="oddball-flow-paper oddball-flow-question-sheet oddball-flow-question-sheet--compact">
          <div>
            <p>Round 03 / Alex is judging</p>
            <small>Your card is already in</small>
          </div>
          <h1>My five-year plan mostly involves</h1>
          <span class="oddball-flow-blank-line" aria-hidden="true"></span>
        </article>

        <section class="oddball-flow-paper oddball-flow-waiting-note" aria-labelledby="oddball-flow-waiting-title">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--waiting" aria-hidden="true"></span>
          <p class="oddball-flow-eyebrow">Receipt / Rowan</p>
          <h1 id="oddball-flow-waiting-title">Your card is in.</h1>
          <blockquote>“Trying to look casual while everything is on fire.”</blockquote>
          <p>Now pretend you were always this confident.</p>
        </section>

        <aside class="oddball-flow-waiting-board" aria-labelledby="oddball-flow-progress-title">
          <div class="oddball-flow-section-label">
            <span aria-hidden="true">››</span>
            <h2 id="oddball-flow-progress-title">Waiting on the room</h2>
            <span aria-hidden="true">‹‹</span>
          </div>
          <ol>
            <li v-for="player in waitingPlayers" :key="player.name" :class="{ ready: player.ready }">
              <i :style="{ background: player.color }" aria-hidden="true"></i>
              <strong>{{ player.name }}</strong>
              <small>{{ player.ready ? 'CARD IN' : 'CHOOSING…' }}</small>
            </li>
          </ol>
          <p class="oddball-flow-feedback" role="status">3 of 4 cards are on the table.</p>
        </aside>
      </div>

      <div v-else-if="screen === 'judging'" class="oddball-flow-game oddball-flow-game--judging">
        <article class="oddball-flow-paper oddball-flow-question-sheet">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--question" aria-hidden="true"></span>
          <div>
            <p>Round 03 / You’re judging</p>
            <small>All 3 answers are in</small>
          </div>
          <h1 id="oddball-flow-czar-question">My five-year plan mostly involves</h1>
          <span class="oddball-flow-blank-line" aria-hidden="true"></span>
        </article>

        <section class="oddball-flow-hand" aria-labelledby="oddball-flow-judging-title">
          <div class="oddball-flow-section-label">
            <span aria-hidden="true">››</span>
            <h2 id="oddball-flow-judging-title">
              {{ winnerLocked ? 'Winner locked' : 'Pick the winning card' }}
            </h2>
            <span aria-hidden="true">‹‹</span>
          </div>
          <ol class="oddball-flow-card-grid oddball-flow-card-grid--judging">
            <li
              v-for="(answer, index) in judgingAnswers"
              :key="answer.id"
              :style="{ '--oddball-flow-accent': answer.color }"
            >
              <button
                class="oddball-flow-answer-card oddball-flow-answer-card--judging"
                :class="{ 'oddball-flow-answer-card--selected': selectedWinnerId === answer.id }"
                type="button"
                :aria-label="`Select winning answer: ${answer.text}`"
                :aria-pressed="selectedWinnerId === answer.id"
                :disabled="winnerLocked"
                @click="selectWinner(answer.id)"
              >
                <span aria-hidden="true">{{ index + 1 }}</span>
                <strong>{{ answer.text }}</strong>
                <small>PLAYER HIDDEN</small>
              </button>
            </li>
          </ol>
        </section>

        <aside class="oddball-flow-paper oddball-flow-play-slip oddball-flow-judge-slip">
          <p class="oddball-flow-eyebrow">Czar’s pencil / Alex</p>
          <h2>{{ winnerLocked ? 'Decision made' : selectedWinnerId ? 'Change your mind?' : 'No pressure' }}</h2>
          <p class="oddball-flow-feedback" role="status" aria-live="polite">
            {{ winnerMessage }}
          </p>
          <p>You can change the marked card until you lock it.</p>
          <button
            class="oddball-flow-primary-button"
            type="button"
            :disabled="!selectedWinnerId || winnerLocked"
            @click="lockWinner"
          >
            {{ winnerLocked ? 'Winner locked' : 'Lock winner' }}
          </button>
        </aside>
      </div>

      <div v-else-if="screen === 'reveal'" class="oddball-flow-reveal">
        <div class="oddball-flow-confetti" aria-hidden="true">
          <i v-for="index in 12" :key="index"></i>
        </div>

        <article class="oddball-flow-paper oddball-flow-reveal-question">
          <p class="oddball-flow-eyebrow">Round 03 / The room has spoken</p>
          <h1>My five-year plan mostly involves...</h1>
        </article>

        <article class="oddball-flow-winning-card">
          <span class="oddball-flow-winning-number" aria-hidden="true">3</span>
          <p>Calling it “networking” so nobody asks questions.</p>
          <div><span>Played by</span><strong>Sam</strong><small>+1 point</small></div>
        </article>

        <aside class="oddball-flow-paper oddball-flow-score-slip">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--score" aria-hidden="true"></span>
          <p class="oddball-flow-eyebrow">Scorekeeper’s note</p>
          <h2>Sam wins the round</h2>
          <ol>
            <li v-for="(player, index) in revealScores" :key="player.name">
              <span>0{{ index + 1 }}</span><strong>{{ player.name }}</strong
              ><small>{{ player.points }} pt</small>
            </li>
          </ol>
          <p class="oddball-flow-feedback" role="status">Next round starts in 5.</p>
        </aside>
      </div>

      <div v-else class="oddball-flow-results">
        <article class="oddball-flow-paper oddball-flow-champion-poster">
          <span class="oddball-tape oddball-flow-tape oddball-flow-tape--champion" aria-hidden="true"></span>
          <p class="oddball-flow-eyebrow">Official-ish final record / 7 rounds</p>
          <h1><span>Alex</span><small>won the room</small></h1>
          <div class="oddball-flow-winner-seal" aria-hidden="true">Oddball<br />champ</div>
          <p>Good company. Terrible answers. A deserved victory.</p>
        </article>

        <section class="oddball-flow-final-board" aria-labelledby="oddball-flow-results-title">
          <div class="oddball-flow-section-label">
            <span aria-hidden="true">››</span>
            <h2 id="oddball-flow-results-title">Final standings</h2>
            <span aria-hidden="true">‹‹</span>
          </div>
          <ol>
            <li
              v-for="(player, index) in finalScores"
              :key="player.name"
              class="oddball-flow-member-card oddball-flow-final-entry"
              :style="{ '--oddball-flow-accent': player.color }"
            >
              <span>0{{ index + 1 }}</span>
              <strong>{{ player.name }}</strong>
              <div aria-hidden="true"><i :style="{ width: `${player.points * 10}%` }"></i></div>
              <small>{{ player.points }} pt</small>
            </li>
          </ol>
          <p class="oddball-flow-feedback" role="status" aria-live="polite">
            {{ resultMessage }}
          </p>
          <button class="oddball-flow-primary-button" type="button" @click="leaveRoom">
            Leave the room
          </button>
        </section>
      </div>

      <nav
        v-if="['player', 'waiting', 'judging', 'reveal'].includes(screen)"
        class="oddball-flow-game-nav"
        aria-label="Game tools"
      >
        <p v-if="toolMessage" class="oddball-flow-tool-message" role="status">
          {{ toolMessage }}
        </p>
        <button type="button" @click="openTool('History')">
          <span aria-hidden="true">↺</span>History
        </button>
        <button type="button" @click="openTool('Chat')">
          <span aria-hidden="true">□</span>Chat
        </button>
        <button type="button" @click="openTool('Players')">
          <span aria-hidden="true">✱</span>Players
        </button>
      </nav>

      <footer class="oddball-flow-footer">
        <span>Oddball Social Club</span><span>{{ screenMeta.footer }}</span
        ><span>Room {{ roomCode }}</span>
      </footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

export type OddballFlowScreen =
  | 'profile'
  | 'lobby'
  | 'player'
  | 'waiting'
  | 'judging'
  | 'reveal'
  | 'results';

const props = withDefaults(
  defineProps<{
    screen?: OddballFlowScreen;
    roomCode?: string;
  }>(),
  {
    screen: 'profile',
    roomCode: 'DECKS',
  },
);

const profileName = ref('');
const profileAttempted = ref(false);
const selectedBadge = ref('teal');
const profileMessage = ref('Choose a name and badge color to claim the empty seat.');
const lobbyMessage = ref('Everyone is here. Start whenever the snacks are settled.');
const selectedAnswerId = ref('');
const answerSubmitted = ref(false);
const answerMessage = ref('No card selected yet.');
const selectedWinnerId = ref('');
const winnerLocked = ref(false);
const winnerMessage = ref('Answers are anonymous until you lock one in.');
const toolMessage = ref('');
const resultMessage = ref('The room stays available until you leave.');
const profileInvalid = computed(() => profileAttempted.value && profileName.value.trim() === '');

const badges = [
  { id: 'teal', name: 'Teal club badge', color: '#57cdbd' },
  { id: 'yellow', name: 'Yellow club badge', color: '#ffd64a' },
  { id: 'red', name: 'Red club badge', color: '#c83f31' },
  { id: 'lilac', name: 'Lilac club badge', color: '#a98af2' },
];

const players = [
  { name: 'Alex', color: '#ffd64a', host: true },
  { name: 'Rowan', color: '#57cdbd', host: false },
  { name: 'Jules', color: '#c83f31', host: false },
  { name: 'Sam', color: '#a98af2', host: false },
];

const waitingPlayers = [
  { name: 'Rowan', color: '#57cdbd', ready: true },
  { name: 'Jules', color: '#c83f31', ready: true },
  { name: 'Sam', color: '#a98af2', ready: false },
];

const playerAnswers = [
  {
    id: 'answer-1',
    text: 'An aggressively enthusiastic thumbs-up.',
    color: '#a98af2',
    blank: false,
  },
  {
    id: 'answer-2',
    text: 'Trying to look casual while everything is on fire.',
    color: '#ffd64a',
    blank: false,
  },
  {
    id: 'answer-3',
    text: 'A suspicious number of tiny cowboy hats.',
    color: '#57cdbd',
    blank: true,
  },
  {
    id: 'answer-4',
    text: 'The exact opposite of a soft launch.',
    color: '#c83f31',
    blank: false,
  },
];

const judgingAnswers = [
  {
    id: 'judge-1',
    text: 'A group chat that should have stayed private.',
    color: '#a98af2',
  },
  {
    id: 'judge-2',
    text: 'The confidence of a man with the wrong answer.',
    color: '#ffd64a',
  },
  {
    id: 'judge-3',
    text: 'Calling it “networking” so nobody asks questions.',
    color: '#57cdbd',
  },
];

const revealScores = [
  { name: 'Alex', points: 3 },
  { name: 'Rowan', points: 2 },
  { name: 'Sam', points: 2 },
  { name: 'Jules', points: 1 },
];

const finalScores = [
  { name: 'Alex', points: 10, color: '#ffd64a' },
  { name: 'Rowan', points: 7, color: '#57cdbd' },
  { name: 'Sam', points: 6, color: '#a98af2' },
  { name: 'Jules', points: 4, color: '#c83f31' },
];

const screenMeta = computed(() => {
  const meta: Record<
    OddballFlowScreen,
    { index: string; label: string; detail: string; footer: string }
  > = {
    profile: {
      index: '01 / MEMBER DESK',
      label: 'Claim a seat',
      detail: 'Three oddballs already inside',
      footer: 'Membership pending',
    },
    lobby: {
      index: '02 / FRONT ROOM',
      label: 'Host copy',
      detail: 'Four of eight seats filled',
      footer: 'Waiting room open',
    },
    player: {
      index: '03 / CARD TABLE',
      label: 'Your turn',
      detail: 'Pick one answer',
      footer: 'Round 03 collecting',
    },
    waiting: {
      index: '04 / CARD TABLE',
      label: 'Card is in',
      detail: 'Waiting on one player',
      footer: 'Three of four ready',
    },
    judging: {
      index: '05 / CZAR DESK',
      label: 'You’re judging',
      detail: 'Three anonymous answers',
      footer: 'Round 03 judging',
    },
    reveal: {
      index: '06 / WINNER WALL',
      label: 'Sam wins',
      detail: 'One point added',
      footer: 'Round 03 complete',
    },
    results: {
      index: '07 / CLUB RECORD',
      label: 'Alex wins',
      detail: 'Seven rounds complete',
      footer: 'Game complete',
    },
  };

  return meta[props.screen];
});

function saveProfile(): void {
  profileAttempted.value = true;
  profileName.value = profileName.value.trim();
  if (!profileName.value) {
    profileMessage.value = 'Write a call sign before taking the seat.';
    return;
  }

  profileMessage.value = `${profileName.value} has a seat. Badge stamped and ready.`;
}

function startGame(): void {
  lobbyMessage.value = 'Round one is starting. Everyone grab a phone.';
}

function selectAnswer(answerId: string): void {
  if (answerSubmitted.value) return;
  selectedAnswerId.value = answerId;
  const answer = playerAnswers.find((candidate) => candidate.id === answerId);
  answerMessage.value = answer ? `Selected: ${answer.text}` : 'No card selected yet.';
}

function submitAnswer(): void {
  const answer = playerAnswers.find((candidate) => candidate.id === selectedAnswerId.value);
  if (!answer) {
    answerMessage.value = 'Pick a card before submitting.';
    return;
  }

  answerSubmitted.value = true;
  answerMessage.value = `Card submitted: ${answer.text}`;
}

function selectWinner(answerId: string): void {
  if (winnerLocked.value) return;
  selectedWinnerId.value = answerId;
  const answer = judgingAnswers.find((candidate) => candidate.id === answerId);
  winnerMessage.value = answer ? `Marked for now: ${answer.text}` : winnerMessage.value;
}

function lockWinner(): void {
  const answer = judgingAnswers.find((candidate) => candidate.id === selectedWinnerId.value);
  if (!answer) {
    winnerMessage.value = 'Mark a card before locking the winner.';
    return;
  }

  winnerLocked.value = true;
  winnerMessage.value = `Winner locked: ${answer.text}`;
}

function openTool(tool: 'History' | 'Chat' | 'Players'): void {
  toolMessage.value = `${tool} panel opened for this concept preview.`;
}

function leaveRoom(): void {
  resultMessage.value = 'Leaving room DECKS and returning to the club entrance.';
}
</script>

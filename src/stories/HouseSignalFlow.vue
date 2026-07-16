<template>
  <main class="house-signal-stage house-flow-stage">
    <section
      class="house-flow-frame house-flow-screen"
      :class="`house-flow-screen--${screen}`"
      tabindex="0"
      aria-label="House Signal interface preview"
    >
      <header class="house-signal-status-band house-flow-band house-flow-status-band">
        <div class="house-signal-station-id">
          <span
            class="house-signal-mark house-signal-mark--small house-flow-mark"
            aria-hidden="true"
          >
            <span class="house-signal-mark__face">
              <i></i><i></i><i></i>
              <b>PD</b>
            </span>
          </span>
          <p><strong>PIMD</strong><span>House signal</span></p>
        </div>

        <p class="house-signal-status house-signal-status--live">
          <span aria-hidden="true"></span><strong>{{ screenMeta.live }}</strong
          ><small>{{ screenMeta.liveDetail }}</small>
        </p>
        <p class="house-signal-status">
          <strong>{{ screenMeta.channel }}</strong><small>{{ screenMeta.channelDetail }}</small>
        </p>
        <p class="house-signal-status house-signal-status--edition">
          <strong>{{ screenMeta.index }}</strong><small>Room decks / private</small>
        </p>
      </header>

      <div v-if="screen === 'profile'" class="house-flow-profile">
        <article class="house-flow-panel house-flow-hero house-flow-hero--profile">
          <div class="house-signal-panel-index">
            <span>CH. 02 / GUEST ID</span><span>UNASSIGNED</span>
          </div>
          <div>
            <p class="house-flow-kicker">Your seat is waiting</p>
            <h1 class="house-flow-display-title">
              <span>Assign</span><span>your</span><span>signal</span>
            </h1>
          </div>
          <div class="house-flow-guest-strip" aria-label="Players already in the room">
            <span v-for="player in players.slice(0, 3)" :key="player.name">
              <i :style="{ background: player.color }" aria-hidden="true"></i>
              {{ player.name }}
            </span>
          </div>
        </article>

        <form class="house-flow-panel house-flow-profile-console" @submit.prevent="submitProfile">
          <div class="house-signal-panel-index">
            <span>INPUT / LOCAL</span><span>MAX 12 CHAR</span>
          </div>

          <div class="house-flow-field">
            <label for="house-flow-call-sign">Call sign</label>
            <input
              id="house-flow-call-sign"
              v-model="profileName"
              type="text"
              maxlength="12"
              autocomplete="nickname"
              placeholder="What should we call you?"
              :aria-invalid="profileError !== ''"
              aria-describedby="house-flow-profile-error"
              @input="profileError = ''"
            />
            <p
              id="house-flow-profile-error"
              class="house-flow-profile-error"
              :role="profileError ? 'alert' : undefined"
            >
              {{ profileError }}
            </p>
          </div>

          <fieldset class="house-flow-frequency-picker">
            <legend>Choose your frequency</legend>
            <div role="radiogroup" aria-label="Player frequency">
              <button
                v-for="frequency in frequencies"
                :key="frequency.id"
                type="button"
                role="radio"
                :aria-checked="profileColor === frequency.id"
                :aria-label="frequency.name"
                :style="{ '--flow-frequency': frequency.color }"
                @click="profileColor = frequency.id"
              >
                <span aria-hidden="true"></span>
                <small>{{ frequency.code }}</small>
              </button>
            </div>
          </fieldset>

          <div class="house-flow-console-footer">
            <p>
              <strong>{{ profileLocked ? 'IDENTITY LOCKED' : 'GUEST CHANNEL' }}</strong>
              <span>{{ profileLocked ? profileName.trim() : 'Open frequency available' }}</span>
            </p>
            <button class="house-flow-action" type="submit">
              <span>Claim this seat</span><span aria-hidden="true">TX →</span>
            </button>
          </div>
        </form>
      </div>

      <div v-else-if="screen === 'lobby'" class="house-flow-lobby">
        <article class="house-flow-panel house-flow-room-panel">
          <div class="house-signal-panel-index">
            <span>CH. 03 / TABLE FEED</span><span>HOST CONTROL</span>
          </div>
          <div class="house-flow-room-code">
            <p>Send this room code to the group</p>
            <h1 aria-label="Room code DECKS">
              <span v-for="letter in roomCode" :key="letter">{{ letter }}</span>
            </h1>
          </div>
          <p class="house-flow-house-note">Good company → bad ideas</p>
        </article>

        <section
          class="house-flow-panel house-flow-roster"
          aria-labelledby="house-flow-roster-title"
        >
          <div class="house-flow-section-heading">
            <div>
              <span>CH. 04 / ACTIVE SIGNALS</span>
              <h2 id="house-flow-roster-title">At the table</h2>
            </div>
            <strong>4 / 8</strong>
          </div>
          <ol>
            <li v-for="(player, index) in players" :key="player.name">
              <span class="house-flow-roster-index">0{{ index + 1 }}</span>
              <i :style="{ background: player.color }" aria-hidden="true"></i>
              <strong>{{ player.name }}</strong>
              <small>{{ player.host ? 'HOUSE HOST' : 'SIGNAL CLEAN' }}</small>
            </li>
          </ol>
        </section>

        <aside class="house-flow-panel house-flow-lobby-controls">
          <section class="house-flow-settings-summary">
            <div class="house-signal-panel-index">
              <span>RULE SET / 07</span><span>EDIT ↗</span>
            </div>
            <dl>
              <div><dt>Cards</dt><dd>7</dd></div>
              <div><dt>Win at</dt><dd>10</dd></div>
              <div><dt>Redraws</dt><dd>4</dd></div>
              <div><dt>Family</dt><dd>Off</dd></div>
            </dl>
          </section>
          <button class="house-flow-start-button" type="button" @click="startGame">
            <span>Start transmission</span><small>All players move to round 01</small>
          </button>
        </aside>
      </div>

      <div v-else-if="screen === 'player'" class="house-flow-round">
        <section
          class="house-flow-panel house-flow-question"
          aria-labelledby="house-flow-player-question"
        >
          <div class="house-signal-panel-index">
            <span>CH. 06 / PROMPT FEED</span><span>ALEX IS THE CZAR</span>
          </div>
          <p>Round 03</p>
          <h1 id="house-flow-player-question">My five-year plan mostly involves ________.</h1>
        </section>

        <aside class="house-flow-panel house-flow-round-console">
          <div class="house-signal-panel-index">
            <span>PLAYER FEED / ROWAN</span><span>03:12</span>
          </div>
          <div class="house-flow-round-state">
            <strong>{{ answerSubmitted ? 'SENT' : selectedAnswerId ? 'READY' : 'PICK' }}</strong>
            <p>
              {{
                answerSubmitted
                  ? 'Your answer is in the house feed.'
                  : selectedAnswerId
                    ? 'Review the marked answer, then transmit.'
                    : 'Choose one answer from your private hand.'
              }}
            </p>
          </div>
          <dl>
            <div><dt>Hand</dt><dd>7</dd></div>
            <div><dt>Redraws</dt><dd>3</dd></div>
            <div><dt>Played</dt><dd>2 / 3</dd></div>
          </dl>
          <button
            class="house-flow-action"
            type="button"
            :disabled="!selectedAnswerId || answerSubmitted"
            @click="submitAnswer"
          >
            <span>{{ answerSubmitted ? 'Answer transmitted' : 'Transmit selected answer' }}</span
            ><span aria-hidden="true">TX →</span>
          </button>
        </aside>

        <section
          class="house-flow-panel house-flow-card-grid"
          aria-label="Your answer cards"
        >
          <button
            v-for="(answer, index) in playerAnswers"
            :key="answer.id"
            class="house-flow-answer-card"
            :class="{
              'house-flow-answer-card--selected': selectedAnswerId === answer.id,
              'house-flow-answer-card--blank': answer.blank,
            }"
            type="button"
            :aria-label="`Select answer: ${answer.text}`"
            :aria-pressed="selectedAnswerId === answer.id"
            :disabled="answerSubmitted"
            @click="selectAnswer(answer.id)"
          >
            <span class="house-flow-card-number">A-0{{ index + 1 }}</span>
            <strong>{{ answer.text }}</strong>
            <small>{{ answer.blank ? 'WRITE-IN / 60 CHAR' : 'HOUSE ANSWER' }}</small>
          </button>
        </section>
      </div>

      <div v-else-if="screen === 'judging'" class="house-flow-round house-flow-round--judging">
        <section
          class="house-flow-panel house-flow-question"
          aria-labelledby="house-flow-czar-question"
        >
          <div class="house-signal-panel-index">
            <span>CH. 07 / CZAR FEED</span><span>ALL SIGNALS RECEIVED</span>
          </div>
          <p>Round 03 / Alex judging</p>
          <h1 id="house-flow-czar-question">My five-year plan mostly involves ________.</h1>
        </section>

        <aside
          class="house-flow-panel house-flow-round-console house-flow-round-console--yellow"
        >
          <div class="house-signal-panel-index">
            <span>DECISION CHANNEL</span><span>3 / 3</span>
          </div>
          <div class="house-flow-round-state">
            <strong>{{ winnerLocked ? 'LOCKED' : selectedWinnerId ? 'MARKED' : 'JUDGE' }}</strong>
            <p>
              {{
                winnerLocked
                  ? 'The winning signal is locked.'
                  : selectedWinnerId
                    ? 'Confirm the marked answer.'
                    : 'Pick the answer that wins the room.'
              }}
            </p>
          </div>
          <p class="house-flow-anonymous-note">Answers stay anonymous until the winner reveal.</p>
          <button
            class="house-flow-action house-flow-action--dark"
            type="button"
            :disabled="!selectedWinnerId || winnerLocked"
            @click="lockWinner"
          >
            <span>{{ winnerLocked ? 'Winning signal locked' : 'Lock winning signal' }}</span
            ><span aria-hidden="true">✓</span>
          </button>
        </aside>

        <section
          class="house-flow-panel house-flow-card-grid house-flow-card-grid--judging"
          aria-label="Answers to judge"
        >
          <button
            v-for="(answer, index) in judgingAnswers"
            :key="answer.id"
            class="house-flow-answer-card house-flow-answer-card--judging"
            :class="{ 'house-flow-answer-card--selected': selectedWinnerId === answer.id }"
            type="button"
            :aria-label="`Select winning answer: ${answer.text}`"
            :aria-pressed="selectedWinnerId === answer.id"
            :disabled="winnerLocked"
            @click="selectWinner(answer.id)"
          >
            <span class="house-flow-card-number">RX-0{{ index + 1 }}</span>
            <strong>{{ answer.text }}</strong>
            <small>PLAYER ID / ENCRYPTED</small>
          </button>
        </section>
      </div>

      <div v-else-if="screen === 'reveal'" class="house-flow-reveal">
        <article class="house-flow-panel house-flow-reveal-card">
          <div class="house-signal-panel-index">
            <span>CH. 08 / WINNING SIGNAL</span><span>ROUND 03 COMPLETE</span>
          </div>
          <p class="house-flow-kicker">My five-year plan mostly involves...</p>
          <h1>Calling it “networking” so nobody asks questions.</h1>
          <div class="house-flow-winner-tag">
            <span>Played by</span><strong>Sam</strong><small>+1 point</small>
          </div>
        </article>

        <aside class="house-flow-panel house-flow-reveal-score">
          <div class="house-signal-panel-index"><span>SCORE UPDATE</span><span>03 / 10</span></div>
          <strong class="house-flow-reveal-callout">SAM<br />WINS</strong>
          <ol aria-label="Current leaderboard">
            <li v-for="(player, index) in revealScores" :key="player.name">
              <span>0{{ index + 1 }}</span><strong>{{ player.name }}</strong
              ><small>{{ player.points }} PT</small>
            </li>
          </ol>
          <p>Next signal opens in <strong>05</strong></p>
        </aside>
      </div>

      <div v-else class="house-flow-results">
        <article class="house-flow-panel house-flow-results-winner">
          <div class="house-signal-panel-index">
            <span>CH. 10 / FINAL RECORD</span><span>07 ROUNDS</span>
          </div>
          <div>
            <p class="house-flow-kicker">House champion / table 01</p>
            <h1><span>Alex</span><small>won the room</small></h1>
          </div>
          <p class="house-flow-house-note">Good company. Terrible answers.</p>
        </article>

        <section
          class="house-flow-panel house-flow-final-board"
          aria-labelledby="house-flow-final-title"
        >
          <div class="house-flow-section-heading">
            <div>
              <span>FINAL TRANSMISSION</span>
              <h2 id="house-flow-final-title">Standings</h2>
            </div>
            <strong>10 PT</strong>
          </div>
          <ol>
            <li v-for="(player, index) in finalScores" :key="player.name">
              <span>0{{ index + 1 }}</span>
              <strong>{{ player.name }}</strong>
              <div aria-hidden="true"><i :style="{ width: `${player.points * 10}%` }"></i></div>
              <small>{{ player.points }} PT</small>
            </li>
          </ol>
          <button class="house-flow-action house-flow-action--dark" type="button">
            <span>Leave the room</span><span aria-hidden="true">END ×</span>
          </button>
        </section>
      </div>

      <footer
        class="house-signal-footer-band house-flow-band house-flow-footer"
        aria-hidden="true"
      >
        <span>HOUSE SIGNAL // {{ screenMeta.footer }}</span>
        <span>ROOM DECKS</span>
        <span>PAIN IN MY DECK // LIVE</span>
      </footer>

      <p
        v-if="announcement"
        class="house-flow-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ announcement }}
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

export type HouseSignalFlowScreen =
  | 'profile'
  | 'lobby'
  | 'player'
  | 'judging'
  | 'reveal'
  | 'results';

const props = withDefaults(
  defineProps<{
    screen?: HouseSignalFlowScreen;
    initialSelectedAnswerId?: string;
    initialAnswerSubmitted?: boolean;
    initialSelectedWinnerId?: string;
    initialWinnerLocked?: boolean;
  }>(),
  {
    screen: 'profile',
    initialSelectedAnswerId: '',
    initialAnswerSubmitted: false,
    initialSelectedWinnerId: '',
    initialWinnerLocked: false,
  },
);

const roomCode = 'DECKS';
const announcement = ref('');
const profileName = ref('');
const profileColor = ref('blue');
const profileLocked = ref(false);
const profileError = ref('');
const selectedAnswerId = ref(props.initialSelectedAnswerId);
const answerSubmitted = ref(props.initialAnswerSubmitted);
const selectedWinnerId = ref(props.initialSelectedWinnerId);
const winnerLocked = ref(props.initialWinnerLocked);

const players = [
  { name: 'Alex', color: '#f5d648', host: true },
  { name: 'Rowan', color: '#7ba4ff', host: false },
  { name: 'Jules', color: '#ff7f66', host: false },
  { name: 'Sam', color: '#b7ec70', host: false },
];

const frequencies = [
  { id: 'blue', name: 'Signal blue', code: '1746', color: '#1746d1' },
  { id: 'yellow', name: 'Acid yellow', code: '5308', color: '#f5d648' },
  { id: 'coral', name: 'Emergency coral', code: '2190', color: '#ff7f66' },
  { id: 'green', name: 'Night green', code: '6604', color: '#83c85c' },
  { id: 'violet', name: 'House violet', code: '4113', color: '#8f72d8' },
];

const playerAnswers = [
  { id: 'answer-1', text: 'An aggressively enthusiastic thumbs-up.', blank: false },
  { id: 'answer-2', text: 'Trying to look casual while everything is on fire.', blank: false },
  { id: 'answer-3', text: 'A suspicious number of tiny cowboy hats.', blank: true },
  { id: 'answer-4', text: 'The exact opposite of a soft launch.', blank: false },
];

const judgingAnswers = [
  { id: 'judge-1', text: 'A group chat that should have stayed private.' },
  { id: 'judge-2', text: 'The confidence of a man with the wrong answer.' },
  { id: 'judge-3', text: 'Calling it “networking” so nobody asks questions.' },
];

const revealScores = [
  { name: 'Alex', points: 3 },
  { name: 'Rowan', points: 2 },
  { name: 'Sam', points: 2 },
  { name: 'Jules', points: 1 },
];

const finalScores = [
  { name: 'Alex', points: 10 },
  { name: 'Rowan', points: 7 },
  { name: 'Sam', points: 6 },
  { name: 'Jules', points: 4 },
];

const screenMeta = computed(() => {
  const meta: Record<
    HouseSignalFlowScreen,
    {
      live: string;
      liveDetail: string;
      channel: string;
      channelDetail: string;
      index: string;
      footer: string;
    }
  > = {
    profile: {
      live: 'OPEN',
      liveDetail: 'Guest access',
      channel: 'CH. 02',
      channelDetail: 'Profile setup',
      index: 'IDX 002-P',
      footer: 'ASSIGNING ID',
    },
    lobby: {
      live: 'READY',
      liveDetail: 'Four connected',
      channel: 'CH. 03',
      channelDetail: 'Table feed',
      index: 'IDX 003-L',
      footer: 'WAITING ROOM',
    },
    player: {
      live: 'ROUND 03',
      liveDetail: 'Collecting',
      channel: 'CH. 06',
      channelDetail: 'Player feed',
      index: 'IDX 006-A',
      footer: 'ANSWER INPUT',
    },
    judging: {
      live: 'JUDGING',
      liveDetail: 'Czar channel',
      channel: 'CH. 07',
      channelDetail: 'Decision feed',
      index: 'IDX 007-J',
      footer: 'CZAR CONTROL',
    },
    reveal: {
      live: 'WINNER',
      liveDetail: 'Signal found',
      channel: 'CH. 08',
      channelDetail: 'Reveal feed',
      index: 'IDX 008-R',
      footer: 'WINNER REVEAL',
    },
    results: {
      live: 'FINAL',
      liveDetail: 'Game complete',
      channel: 'CH. 10',
      channelDetail: 'Final record',
      index: 'IDX 010-F',
      footer: 'END TRANSMISSION',
    },
  };

  return meta[props.screen];
});

function submitProfile(): void {
  profileName.value = profileName.value.trim();
  if (!profileName.value) {
    profileError.value = 'Enter a call sign first';
    announcement.value = 'Enter a call sign first';
    return;
  }

  profileError.value = '';
  profileLocked.value = true;
  announcement.value = `Profile set for ${profileName.value}`;
}

function startGame(): void {
  announcement.value = 'Starting round one';
}

function selectAnswer(answerId: string): void {
  if (answerSubmitted.value) return;
  selectedAnswerId.value = answerId;
  const answer = playerAnswers.find((candidate) => candidate.id === answerId);
  announcement.value = answer ? `Selected answer: ${answer.text}` : '';
}

function submitAnswer(): void {
  const answer = playerAnswers.find((candidate) => candidate.id === selectedAnswerId.value);
  if (!answer) {
    announcement.value = 'Choose an answer first';
    return;
  }

  answerSubmitted.value = true;
  announcement.value = `Answer transmitted: ${answer.text}`;
}

function selectWinner(answerId: string): void {
  if (winnerLocked.value) return;
  selectedWinnerId.value = answerId;
  const answer = judgingAnswers.find((candidate) => candidate.id === answerId);
  announcement.value = answer ? `Selected winning answer: ${answer.text}` : '';
}

function lockWinner(): void {
  const answer = judgingAnswers.find((candidate) => candidate.id === selectedWinnerId.value);
  if (!answer) {
    announcement.value = 'Choose a winning answer first';
    return;
  }

  winnerLocked.value = true;
  announcement.value = `Winning signal locked: ${answer.text}`;
}
</script>

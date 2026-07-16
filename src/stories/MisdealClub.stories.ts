import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';
import { computed, defineComponent, ref, type PropType } from 'vue';

import './misdeal-club.css';

type MisdealScreen = 'home' | 'czar';

const answers = [
  'A group chat that should have stayed private.',
  'The confidence of a man with the wrong answer.',
  'Calling it networking so nobody asks questions.',
] as const;

const MisdealClub = defineComponent({
  name: 'MisdealClub',
  props: {
    screen: {
      type: String as PropType<MisdealScreen>,
      required: true,
    },
  },
  setup() {
    const roomCode = ref('DECKS');
    const selectedAnswer = ref<number | null>(null);
    const announcement = ref('');
    const verdictLabel = computed(() =>
      selectedAnswer.value === null
        ? 'Deal one winner here'
        : `Card ${selectedAnswer.value + 1} wins`,
    );

    function updateRoomCode(event: Event): void {
      const input = event.currentTarget as HTMLInputElement;
      const nextValue = input.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5);
      roomCode.value = nextValue;
      input.value = nextValue;
    }

    function joinRoom(): void {
      announcement.value =
        roomCode.value.length === 5
          ? `Joining room ${roomCode.value}`
          : 'Enter a five-character room code';
    }

    function startGame(): void {
      announcement.value = 'Starting a new game';
    }

    function chooseAnswer(index: number): void {
      selectedAnswer.value = index;
      announcement.value = `Card ${index + 1} selected: ${answers[index]}`;
    }

    return {
      announcement,
      answers,
      chooseAnswer,
      joinRoom,
      roomCode,
      selectedAnswer,
      startGame,
      updateRoomCode,
      verdictLabel,
    };
  },
  template: `
    <main
      class="misdeal-stage"
      :class="screen === 'home' ? 'misdeal-stage--home' : 'misdeal-stage--czar'"
    >
      <template v-if="screen === 'home'">
        <section class="misdeal-home" aria-labelledby="misdeal-home-title">
          <header class="misdeal-club-rail misdeal-club-rail--home">
            <p><span class="misdeal-pip misdeal-pip--small" aria-hidden="true"><span></span></span> Misdeal Club</p>
            <p>Private table · Open nightly</p>
            <p>Member no. 0001</p>
          </header>

          <div class="misdeal-home__layout">
            <div class="misdeal-brand-lockup">
              <div class="misdeal-club-seal" aria-hidden="true">
                <span class="misdeal-pip"><span></span></span>
                <span>House<br />mark 01</span>
              </div>

              <h1 id="misdeal-home-title" class="misdeal-wordmark" aria-label="Pain in my Deck">
                <span class="misdeal-wordmark__line misdeal-wordmark__line--pain">Pain</span>
                <span class="misdeal-wordmark__bridge">in my</span>
                <span class="misdeal-wordmark__line misdeal-wordmark__line--deck">Deck</span>
              </h1>
              <p class="misdeal-tagline">A private card club for publicly bad ideas.</p>

              <div class="misdeal-card-fan" aria-hidden="true">
                <span class="misdeal-card-back misdeal-card-back--left"></span>
                <span class="misdeal-card-back misdeal-card-back--middle"></span>
                <span class="misdeal-card-back misdeal-card-back--misdeal">
                  <span class="misdeal-pip"><span></span></span>
                </span>
              </div>
            </div>

            <div class="misdeal-card-shell misdeal-membership-shell">
              <span class="misdeal-card-shell__edge misdeal-card-shell__edge--pool" aria-hidden="true"></span>
              <span class="misdeal-card-shell__edge misdeal-card-shell__edge--butter" aria-hidden="true"></span>
              <span class="misdeal-card-shell__edge misdeal-card-shell__edge--tomato" aria-hidden="true"></span>

              <form class="misdeal-membership-card" @submit.prevent="joinRoom">
                <span class="misdeal-card-index misdeal-card-index--top" aria-hidden="true">
                  <b>Join</b><span>01</span>
                </span>
                <span class="misdeal-card-index misdeal-card-index--bottom" aria-hidden="true">
                  <b>Join</b><span>01</span>
                </span>

                <div class="misdeal-membership-card__content">
                  <p class="misdeal-kicker">Admit one bad influence</p>
                  <label for="misdeal-room-code">Room code</label>
                  <input
                    id="misdeal-room-code"
                    class="misdeal-room-code-input"
                    :value="roomCode"
                    type="text"
                    inputmode="text"
                    autocomplete="off"
                    autocapitalize="characters"
                    aria-describedby="misdeal-room-help"
                    @input="updateRoomCode"
                  />
                  <span id="misdeal-room-help" class="misdeal-visually-hidden">
                    Enter the five-character code shown on the host screen.
                  </span>

                  <button class="misdeal-primary-action" type="submit">
                    <span>Take your seat</span><span aria-hidden="true">↗</span>
                  </button>
                  <button class="misdeal-secondary-action" type="button" @click="startGame">
                    Open a new table
                  </button>
                </div>

                <footer class="misdeal-membership-card__footer">
                  <span>House rules apply</span>
                  <span class="misdeal-pip misdeal-pip--small" aria-hidden="true"><span></span></span>
                  <span>No good answers</span>
                </footer>
              </form>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="misdeal-table" aria-labelledby="misdeal-question">
          <header class="misdeal-club-rail misdeal-club-rail--game">
            <p><span class="misdeal-pip misdeal-pip--small" aria-hidden="true"><span></span></span> Misdeal Club</p>
            <p>Room <strong>Decks</strong></p>
            <p>Round <strong>03</strong></p>
            <p class="misdeal-role-chip">You judge</p>
          </header>

          <div class="misdeal-round-layout">
            <div class="misdeal-card-shell misdeal-prompt-shell">
              <span class="misdeal-card-shell__edge misdeal-card-shell__edge--pool" aria-hidden="true"></span>
              <span class="misdeal-card-shell__edge misdeal-card-shell__edge--butter" aria-hidden="true"></span>
              <span class="misdeal-card-shell__edge misdeal-card-shell__edge--tomato" aria-hidden="true"></span>

              <article class="misdeal-prompt-card">
                <span class="misdeal-card-index misdeal-card-index--top" aria-hidden="true">
                  <b>Ask</b><span>03</span>
                </span>
                <span class="misdeal-card-index misdeal-card-index--bottom" aria-hidden="true">
                  <b>Ask</b><span>03</span>
                </span>
                <div class="misdeal-prompt-card__copy">
                  <p>Prompt 03 / The long game</p>
                  <h1 id="misdeal-question">My five-year plan mostly involves</h1>
                  <span aria-hidden="true"></span>
                </div>
              </article>
            </div>

            <aside
              class="misdeal-verdict-slot"
              :class="{ 'misdeal-verdict-slot--filled': selectedAnswer !== null }"
              aria-live="polite"
            >
              <span class="misdeal-pip" aria-hidden="true"><span></span></span>
              <p>{{ verdictLabel }}</p>
              <small>{{ selectedAnswer === null ? 'Tap a card below' : 'Tap another card to change it' }}</small>
            </aside>
          </div>

          <div class="misdeal-answer-area">
            <div class="misdeal-answer-heading">
              <p>Three answers entered</p>
              <h2>{{ selectedAnswer === null ? 'Choose the winning card' : 'Winner on the table' }}</h2>
            </div>

            <ol class="misdeal-answer-grid" aria-label="Submitted answers">
              <li
                v-for="(answer, index) in answers"
                :key="answer"
                class="misdeal-answer-shell"
                :class="[
                  { 'misdeal-answer-shell--misdeal': index === 1 },
                  { 'misdeal-answer-shell--selected': selectedAnswer === index },
                ]"
              >
                <span class="misdeal-answer-edge misdeal-answer-edge--pool" aria-hidden="true"></span>
                <span class="misdeal-answer-edge misdeal-answer-edge--butter" aria-hidden="true"></span>
                <span class="misdeal-answer-edge misdeal-answer-edge--tomato" aria-hidden="true"></span>
                <button
                  class="misdeal-answer-card"
                  type="button"
                  :aria-pressed="selectedAnswer === index"
                  @click="chooseAnswer(index)"
                >
                  <span class="misdeal-answer-card__index" aria-hidden="true">
                    <b>{{ index + 1 }}</b><span>Ans</span>
                  </span>
                  <span class="misdeal-answer-card__copy">{{ answer }}</span>
                  <span class="misdeal-answer-card__pip misdeal-pip misdeal-pip--small" aria-hidden="true"><span></span></span>
                </button>
              </li>
            </ol>
          </div>

          <nav class="misdeal-game-nav" aria-label="Game information">
            <button type="button"><span>01</span> History</button>
            <button type="button"><span>02</span> Chat</button>
            <button type="button"><span>06</span> Players</button>
          </nav>
        </section>
      </template>

      <p class="misdeal-visually-hidden" aria-live="polite">{{ announcement }}</p>
    </main>
  `,
});

const meta = {
  title: 'Brand exploration/Option C.1 — Misdeal Club',
  component: MisdealClub,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A DOM/CSS evolution of Option C built around a fixed card-club grammar: clipped corners, mirrored indexes, a proprietary pip, controlled deck edges, and one intentional misdeal per screen.',
      },
    },
  },
} satisfies Meta<typeof MisdealClub>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {
  args: { screen: 'home' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const HomeRoomCodeInteraction: Story = {
  name: 'Home / room code interaction',
  args: { screen: 'home' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const roomCode = canvas.getByLabelText('Room code');
    await userEvent.clear(roomCode);
    await userEvent.type(roomCode, 'a-1 b?2c3');
    await expect(roomCode).toHaveValue('A1B2C');
    await userEvent.click(canvas.getByRole('button', { name: 'Take your seat' }));
    await expect(canvas.findByText('Joining room A1B2C')).resolves.toBeInTheDocument();
  },
};

export const CzarJudging: Story = {
  name: 'Czar judging',
  args: { screen: 'czar' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const CzarWinnerSelected: Story = {
  name: 'Czar / winner selected',
  args: { screen: 'czar' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const winner = canvas.getByRole('button', {
      name: 'The confidence of a man with the wrong answer.',
    });
    await userEvent.click(winner);
    await expect(winner).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.findByText('Card 2 wins')).resolves.toBeVisible();
  },
};

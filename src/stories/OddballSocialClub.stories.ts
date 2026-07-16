import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';
import { computed, defineComponent, ref, type PropType } from 'vue';

import { isRoomId, normalizeRoomId } from '@/shared/protocol';

import './oddball-social-club.css';

type OddballScreen = 'home' | 'czar';

const answers = [
  'A group chat that should have stayed private.',
  'The confidence of a man with the wrong answer.',
  'Calling it networking so nobody asks questions.',
] as const;

const OddballSocialClub = defineComponent({
  name: 'OddballSocialClub',
  props: {
    screen: {
      type: String as PropType<OddballScreen>,
      required: true,
    },
  },
  setup() {
    const roomCode = ref('DECKS');
    const selectedAnswer = ref<number | null>(null);
    const announcement = ref('');
    const joinAttempted = ref(false);
    const roomCodeInvalid = computed(() => joinAttempted.value && !isRoomId(roomCode.value));
    const roomCodeCharacters = computed(() =>
      Array.from({ length: 5 }, (_, index) => roomCode.value[index] ?? ''),
    );

    function updateRoomCode(event: Event): void {
      const input = event.currentTarget as HTMLInputElement;
      const nextValue = normalizeRoomId(input.value)
        .replace(/[^A-HJ-NP-Z]/g, '')
        .slice(0, 5);
      roomCode.value = nextValue;
      input.value = nextValue;
    }

    function joinRoom(): void {
      joinAttempted.value = true;
      announcement.value = isRoomId(roomCode.value)
        ? `Joining room ${roomCode.value}`
        : 'Enter a five-letter room code';
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
      roomCodeCharacters,
      roomCodeInvalid,
      selectedAnswer,
      startGame,
      updateRoomCode,
    };
  },
  template: `
    <main
      class="oddball-stage"
      :class="screen === 'home' ? 'oddball-stage--home' : 'oddball-stage--czar'"
    >
      <template v-if="screen === 'home'">
        <section class="oddball-home" aria-labelledby="oddball-home-title">
          <div class="oddball-badge" aria-label="Pain in my Deck!">
            <span>Pain</span>
            <span>in my</span>
            <span>Deck!</span>
          </div>

          <div class="oddball-edge-card oddball-edge-card--asterisk" aria-hidden="true">
            <span>✱</span>
          </div>
          <div class="oddball-edge-card oddball-edge-card--bolt" aria-hidden="true">
            <span>ϟ</span>
          </div>
          <div class="oddball-edge-card oddball-edge-card--arrow" aria-hidden="true">
            <span>↖</span>
          </div>
          <div class="oddball-edge-card oddball-edge-card--globe" aria-hidden="true">
            <span></span>
          </div>

          <header class="oddball-brand-lockup">
            <h1 id="oddball-home-title" class="oddball-wordmark">
              <span class="oddball-wordmark__pain">Pain</span>
              <span class="oddball-wordmark__in-my">in my</span>
              <span class="oddball-wordmark__deck">Deck</span>
            </h1>
            <p class="oddball-tagline">Good company. Terrible answers.</p>
          </header>

          <form class="oddball-join-sheet" @submit.prevent="joinRoom">
            <span class="oddball-tape oddball-tape--join" aria-hidden="true"></span>
            <span class="oddball-punches" aria-hidden="true"></span>

            <label class="oddball-room-label" for="oddball-room-code">Enter room code</label>
            <div class="oddball-room-code-control">
              <input
                id="oddball-room-code"
                class="oddball-room-code-input"
                :value="roomCode"
                type="text"
                inputmode="text"
                autocomplete="off"
                autocapitalize="characters"
                :aria-invalid="roomCodeInvalid"
                aria-describedby="oddball-room-help oddball-form-status"
                @input="updateRoomCode"
              />
              <span
                v-for="(character, index) in roomCodeCharacters"
                :key="index"
                class="oddball-room-code-cell"
                aria-hidden="true"
              >{{ character }}</span>
            </div>
            <span id="oddball-room-help" class="oddball-visually-hidden">
              Enter the five-letter code shown on the host screen.
            </span>
            <span class="oddball-red-scribble" aria-hidden="true"></span>

            <p id="oddball-form-status" class="oddball-form-status" role="status" aria-live="polite">
              {{ announcement }}
            </p>

            <button class="oddball-play-button" type="submit">Play</button>
            <button class="oddball-new-game-button" type="button" @click="startGame">
              Start a new game
            </button>
          </form>
        </section>
      </template>

      <template v-else>
        <section class="oddball-czar" aria-labelledby="oddball-question">
          <div class="oddball-czar__felt">
            <header class="oddball-czar__header">
              <div class="oddball-room-heading-wrap">
                <span class="oddball-tape oddball-tape--room-left" aria-hidden="true"></span>
                <span class="oddball-tape oddball-tape--room-right" aria-hidden="true"></span>
                <p class="oddball-room-heading">Room Decks</p>
                <p class="oddball-round-status">You’re judging&nbsp; • &nbsp;3 of 3 answers</p>
              </div>

              <div class="oddball-question-paper">
                <h1 id="oddball-question">
                  My five-year plan<br />
                  mostly involves
                </h1>
                <span class="oddball-question-blank" aria-hidden="true"></span>
              </div>
            </header>

            <div class="oddball-pick-label">
              <span aria-hidden="true">››</span>
              <h2>{{ selectedAnswer === null ? 'Select the winning card' : 'Winner selected' }}</h2>
              <span aria-hidden="true">‹‹</span>
            </div>

            <ol class="oddball-answer-grid" aria-label="Submitted answers">
              <li v-for="(answer, index) in answers" :key="answer">
                <button
                  class="oddball-answer-card"
                  :class="[
                    'oddball-answer-card--' + (index + 1),
                    { 'oddball-answer-card--selected': selectedAnswer === index },
                  ]"
                  type="button"
                  :aria-pressed="selectedAnswer === index"
                  @click="chooseAnswer(index)"
                >
                  <span class="oddball-answer-card__number" aria-hidden="true">{{ index + 1 }}</span>
                  <span>{{ answer }}</span>
                </button>
              </li>
            </ol>

            <nav class="oddball-game-nav" aria-label="Game information">
              <button type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 7v5l3 2"></path>
                </svg>
                <span>History</span>
              </button>
              <button type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5.5h16v10H9l-5 4v-14Z"></path>
                </svg>
                <span>Chat</span>
              </button>
              <button type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3"></circle>
                  <circle cx="17" cy="9" r="2.5"></circle>
                  <path d="M3.5 19c.3-4 2.3-6 5.5-6s5.2 2 5.5 6M14 14c3.8-.7 6.1 1 6.5 5"></path>
                </svg>
                <span>Players</span>
              </button>
            </nav>
          </div>
        </section>
      </template>

      <p
        v-if="screen === 'czar'"
        class="oddball-visually-hidden"
        role="status"
        aria-live="polite"
      >{{ announcement }}</p>
    </main>
  `,
});

const meta = {
  title: 'Pain in my Deck!/Brand reference',
  component: OddballSocialClub,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
    docs: {
      description: {
        component:
          'A DOM/CSS implementation of the Pain in my Deck! visual direction. The screens are isolated from live game state so layout and interactions can be reviewed directly.',
      },
    },
  },
} satisfies Meta<typeof OddballSocialClub>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {
  args: { screen: 'home' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const CzarJudging: Story = {
  name: 'Czar judging',
  args: { screen: 'czar' },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const RoomCodeInteraction: Story = {
  name: 'Home / room code interaction',
  args: { screen: 'home' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const roomCode = canvas.getByRole('textbox', { name: 'Enter room code' });

    await userEvent.clear(roomCode);
    await userEvent.type(roomCode, 'i0a');
    await expect(roomCode).toHaveValue('A');
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await expect(canvas.findByText('Enter a five-letter room code')).resolves.toBeInTheDocument();

    await userEvent.clear(roomCode);
    await userEvent.type(roomCode, 'd-e c_k!s9');
    await expect(roomCode).toHaveValue('DECKS');
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await expect(canvas.findByText('Joining room DECKS')).resolves.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Start a new game' }));
    await expect(canvas.findByText('Starting a new game')).resolves.toBeInTheDocument();
  },
};

export const CzarSelectionInteraction: Story = {
  name: 'Czar / answer selection interaction',
  args: { screen: 'czar' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const secondAnswer = canvas.getByRole('button', {
      name: 'The confidence of a man with the wrong answer.',
    });
    const thirdAnswer = canvas.getByRole('button', {
      name: 'Calling it networking so nobody asks questions.',
    });

    await expect(secondAnswer).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(secondAnswer);
    await expect(secondAnswer).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('heading', { name: 'Winner selected' })).toBeVisible();

    await userEvent.click(thirdAnswer);
    await expect(secondAnswer).toHaveAttribute('aria-pressed', 'false');
    await expect(thirdAnswer).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.findByText(/Card 3 selected:/)).resolves.toBeInTheDocument();
  },
};

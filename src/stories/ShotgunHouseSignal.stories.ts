import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';
import { defineComponent, ref } from 'vue';

import { isRoomId, normalizeRoomId } from '@/shared/protocol';

import './shotgun-house-signal.css';

const ShotgunHouseSignal = defineComponent({
  name: 'ShotgunHouseSignal',
  setup() {
    const roomCode = ref('DECKS');
    const announcement = ref('');
    const errorMessage = ref('');

    function updateRoomCode(event: Event): void {
      const input = event.currentTarget as HTMLInputElement;
      const nextValue = normalizeRoomId(input.value)
        .replace(/[^A-HJ-NP-Z]/g, '')
        .slice(0, 5);

      roomCode.value = nextValue;
      input.value = nextValue;
      errorMessage.value = '';
    }

    function joinRoom(): void {
      if (isRoomId(roomCode.value)) {
        errorMessage.value = '';
        announcement.value = `Joining room ${roomCode.value}`;
        return;
      }

      errorMessage.value = 'Enter a five-letter room code';
      announcement.value = errorMessage.value;
    }

    function startGame(): void {
      announcement.value = 'Starting a new game';
    }

    return {
      announcement,
      errorMessage,
      joinRoom,
      roomCode,
      startGame,
      updateRoomCode,
    };
  },
  template: `
    <main class="house-signal-stage">
      <section class="house-signal-home" aria-labelledby="house-signal-title">
        <header class="house-signal-status-band">
          <div class="house-signal-station-id">
            <span class="house-signal-mark house-signal-mark--small" aria-hidden="true">
              <span class="house-signal-mark__face">
                <i></i><i></i><i></i>
                <b>PD</b>
              </span>
            </span>
            <p><strong>PIMD</strong><span>House transmission</span></p>
          </div>
          <p class="house-signal-status house-signal-status--live">
            <span aria-hidden="true"></span><strong>Live</strong><small>Open nightly</small>
          </p>
          <p class="house-signal-status">
            <strong>CH. 00</strong><small>Guest frequency</small>
          </p>
          <p class="house-signal-status house-signal-status--edition">
            <strong>IDX 002-C</strong><small>Club signal / 2026</small>
          </p>
        </header>

        <div class="house-signal-broadcast-grid">
          <article class="house-signal-identity-panel">
            <div class="house-signal-panel-index">
              <span>CH. 01 / PRIMARY ID</span>
              <span>TX 1746.01</span>
            </div>

            <div class="house-signal-identity-lockup">
              <span class="house-signal-mark house-signal-mark--hero" aria-hidden="true">
                <span class="house-signal-mark__face">
                  <em>SIGNAL</em>
                  <i></i><i></i><i></i>
                  <b>PD</b>
                </span>
              </span>
              <h1 id="house-signal-title" aria-label="Pain in my Deck">
                <span>Pain</span>
                <small>in my</small>
                <span>Deck</span>
              </h1>
            </div>

            <div class="house-signal-identity-footer">
              <p>A card club for<br />publicly bad ideas.</p>
              <div class="house-signal-bars" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>

            <aside class="house-signal-misroute" aria-label="Misrouted house message">
              <span>X-09 / MISROUTED</span>
              <strong>GOOD COMPANY → BAD IDEAS</strong>
            </aside>
          </article>

          <aside class="house-signal-panel house-signal-panel--house">
            <div class="house-signal-panel-index">
              <span>CH. 03 / HOUSE STATE</span><span>01:01</span>
            </div>
            <strong class="house-signal-panel-callout">OPEN</strong>
            <div class="house-signal-bars house-signal-bars--dark" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
            </div>
            <p>No dress code<br />No good judgment</p>
          </aside>

          <aside class="house-signal-panel house-signal-panel--capacity">
            <div class="house-signal-panel-index">
              <span>CH. 05 / TABLE FEED</span><span>READY</span>
            </div>
            <div class="house-signal-capacity">
              <strong>5/5</strong>
              <p>Characters<br />to enter</p>
            </div>
            <p class="house-signal-frequency">FREQ: PRIVATE / RANGE: FRIENDS</p>
          </aside>
        </div>

        <form class="house-signal-access-console" @submit.prevent="joinRoom">
          <div class="house-signal-access-band">
            <p><span>CH. 02</span><strong>Patch into the room</strong></p>
            <p>Enter the five-character code from your host screen.</p>
          </div>

          <div class="house-signal-access-body">
            <div class="house-signal-code-field">
              <label for="house-signal-room-code">
                <span>Guest input / five characters</span>
                <strong>Room code</strong>
              </label>
              <div class="house-signal-code-shell">
                <div class="house-signal-code-tiles" aria-hidden="true">
                  <span v-for="index in 5" :key="index">{{ roomCode[index - 1] || '·' }}</span>
                </div>
                <input
                  id="house-signal-room-code"
                  :value="roomCode"
                  type="text"
                  aria-label="Room code"
                  inputmode="text"
                  autocomplete="off"
                  autocapitalize="characters"
                  :aria-invalid="errorMessage !== ''"
                  :aria-describedby="errorMessage ? 'house-signal-room-help house-signal-room-error' : 'house-signal-room-help'"
                  @input="updateRoomCode"
                />
              </div>
              <span
                v-if="errorMessage"
                id="house-signal-room-error"
                class="house-signal-room-error"
                role="alert"
              >
                {{ errorMessage }}
              </span>
              <span id="house-signal-room-help" class="house-signal-visually-hidden">
                Enter the five-letter code shown on the host screen.
              </span>
            </div>

            <div class="house-signal-actions">
              <button class="house-signal-join-button" type="submit">
                <span>Join room</span><span aria-hidden="true">TX →</span>
              </button>
              <button class="house-signal-new-button" type="button" @click="startGame">
                Start a new game
              </button>
            </div>
          </div>
        </form>

        <footer class="house-signal-footer-band" aria-hidden="true">
          <span>HOUSE SIGNAL // ACTIVE</span>
          <span>PAIN IN MY DECK</span>
          <span>ENDLESS BAD ANSWERS // 01</span>
        </footer>

        <p class="house-signal-visually-hidden" aria-live="polite" aria-atomic="true">
          {{ announcement }}
        </p>
      </section>
    </main>
  `,
});

const meta = {
  title: 'Brand exploration/Shotgun 2/C — House Signal',
  component: ShotgunHouseSignal,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A modular live-broadcast identity for the club, built from full-width status bands, clipped signal cards, giant room-code tiles, and one deliberately misrouted house message.',
      },
    },
  },
} satisfies Meta<typeof ShotgunHouseSignal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const RoomCodeInteraction: Story = {
  name: 'Home / room code interaction',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const roomCode = canvas.getByRole('textbox', { name: 'Room code' });

    await userEvent.clear(roomCode);
    await userEvent.type(roomCode, 'i0a');
    await expect(roomCode).toHaveValue('A');
    await userEvent.click(canvas.getByRole('button', { name: 'Join room' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Enter a five-letter room code');

    await userEvent.clear(roomCode);
    await userEvent.type(roomCode, 'd-e c_k!s9');
    await expect(roomCode).toHaveValue('DECKS');
    await userEvent.click(canvas.getByRole('button', { name: 'Join room' }));
    await expect(canvas.findByText('Joining room DECKS')).resolves.toBeInTheDocument();
  },
};

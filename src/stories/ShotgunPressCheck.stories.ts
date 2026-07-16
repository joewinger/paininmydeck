import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';
import { defineComponent, ref } from 'vue';

import './shotgun-press-check.css';

const ShotgunPressCheck = defineComponent({
  name: 'ShotgunPressCheck',
  setup() {
    const roomCode = ref('DECKS');
    const announcement = ref('');

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

    return {
      announcement,
      joinRoom,
      roomCode,
      startGame,
      updateRoomCode,
    };
  },
  template: `
    <main class="press-check-stage">
      <section class="press-check-home" aria-labelledby="press-check-title">
        <header class="press-check-proof-rail">
          <div class="press-check-proof-rail__identity">
            <span class="press-check-mark press-check-mark--mini" aria-hidden="true">
              <span class="press-check-mark__face">
                <span class="press-check-target"><i></i></span>
              </span>
            </span>
            <p><strong>Pain in my Deck</strong><span>Private card club</span></p>
          </div>

          <p class="press-check-proof-field">
            <span>Proof</span>
            <strong>02 / A</strong>
          </p>
          <p class="press-check-proof-field press-check-proof-field--plate">
            <span>Plate</span>
            <strong>04 / 04</strong>
          </p>
          <p class="press-check-proof-field press-check-proof-field--house">
            <span>House no.</span>
            <strong>00001</strong>
          </p>
        </header>

        <div class="press-check-masthead">
          <div class="press-check-masthead__topline">
            <div class="press-check-edition">
              <span class="press-check-mark press-check-mark--hero" aria-hidden="true">
                <span class="press-check-mark__face">
                  <b>01</b>
                  <span class="press-check-target"><i></i></span>
                  <small>P / D</small>
                </span>
              </span>
              <p>
                <span>Invitation series</span>
                <strong>Press check no. 02</strong>
              </p>
            </div>

            <p class="press-check-run-note">
              Printed for bad ideas<br />
              Shared among good company
            </p>
          </div>

          <h1 id="press-check-title" class="press-check-title" aria-label="Pain in my Deck">
            <span>PAIN</span>
            <span class="press-check-title__small">IN MY</span>
            <span class="press-check-title__slip" data-registration="DECK">DECK</span>
          </h1>

          <div class="press-check-masthead__footer">
            <p class="press-check-deckline">
              A private card club<br />
              for publicly bad ideas.
            </p>

            <dl class="press-check-index" aria-label="Edition details">
              <div>
                <dt>01 / Company</dt>
                <dd>Questionable</dd>
              </div>
              <div>
                <dt>02 / Dress</dt>
                <dd>Unrequired</dd>
              </div>
              <div>
                <dt>03 / Judgment</dt>
                <dd>Temporary</dd>
              </div>
            </dl>
          </div>
        </div>

        <form class="press-check-join-band" @submit.prevent="joinRoom">
          <div class="press-check-join-band__heading">
            <p>Entry form / 01</p>
            <h2>Take your seat.</h2>
            <span>Nightly admission · Five characters</span>
          </div>

          <div class="press-check-room-control">
            <label for="press-check-room-code">
              <span aria-hidden="true">Field 01</span>
              Room code
            </label>
            <input
              id="press-check-room-code"
              :value="roomCode"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="characters"
              aria-describedby="press-check-room-help"
              @input="updateRoomCode"
            />
            <span id="press-check-room-help" class="press-check-visually-hidden">
              Enter the five-character code shown on the host screen.
            </span>
          </div>

          <button class="press-check-join-button" type="submit">
            <span>Join room</span>
            <span aria-hidden="true">→</span>
          </button>

          <button class="press-check-new-game-button" type="button" @click="startGame">
            Start a new game
          </button>
        </form>

        <p class="press-check-visually-hidden" aria-live="polite" aria-atomic="true">
          {{ announcement }}
        </p>
      </section>
    </main>
  `,
});

const meta = {
  title: 'Brand exploration/Shotgun 2/A — Press Check',
  component: ShotgunPressCheck,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A print-registration proof for a high-energy private card club: clipped-card targets, hard ink offsets, numbered proof fields, and one deliberately slipped cyan impression.',
      },
    },
  },
} satisfies Meta<typeof ShotgunPressCheck>;

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
    await userEvent.type(roomCode, 'd-e c_k!s9');
    await expect(roomCode).toHaveValue('DECKS');
    await userEvent.click(canvas.getByRole('button', { name: 'Join room' }));
    await expect(canvas.findByText('Joining room DECKS')).resolves.toBeInTheDocument();
  },
};

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, userEvent, within } from 'storybook/test';
import { defineComponent, ref } from 'vue';

import './shotgun-night-shift.css';

const NightShiftHome = defineComponent({
  name: 'NightShiftHome',
  setup() {
    const roomCode = ref('DECKS');
    const announcement = ref('Access desk standing by.');

    function updateRoomCode(event: Event): void {
      const input = event.currentTarget as HTMLInputElement;
      const normalizedCode = input.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5);

      roomCode.value = normalizedCode;
      input.value = normalizedCode;
    }

    function joinRoom(): void {
      announcement.value =
        roomCode.value.length === 5
          ? `Access confirmed. Joining room ${roomCode.value}.`
          : 'Access held. Enter all five characters.';
    }

    function startNewGame(): void {
      announcement.value = 'New game setup selected.';
    }

    return {
      announcement,
      joinRoom,
      roomCode,
      startNewGame,
      updateRoomCode,
    };
  },
  template: `
    <main class="night-shift" aria-labelledby="night-shift-title">
      <aside class="night-word-rail" aria-hidden="true">
        <span class="night-word-rail__index">P/D · 01</span>
        <span class="night-word-rail__name">Pain in my Deck</span>
        <span class="night-word-rail__index">Night access</span>
      </aside>

      <header class="night-mast">
        <p><span class="night-live-dot" aria-hidden="true"></span>Private card club</p>
        <p class="night-mast__center">After-hours access / always unrated</p>
        <p>Shift 02 · Open</p>
      </header>

      <section class="night-entry-zone" aria-label="Night Shift club entry">
        <div class="night-poster-copy" aria-hidden="true">
          <p>Clock in for</p>
          <span>After</span>
          <span>Hours</span>
          <b>Bad ideas welcome late.</b>
        </div>

        <div class="night-blue-note" aria-hidden="true">
          <span>No good answers</span>
          <b>Just fast ones.</b>
          <small>00:42 / N–02</small>
        </div>

        <div class="night-pass-stack">
          <div class="night-slipped-pass" aria-hidden="true">
            <span>GUEST ACCESS · GUEST ACCESS · GUEST ACCESS</span>
          </div>

          <form class="night-pass" @submit.prevent="joinRoom">
            <div class="night-pass__inner">
              <header class="night-pass__header">
                <div class="night-access-mark" aria-hidden="true">
                  <span>P</span><i></i><span>D</span>
                </div>
                <div class="night-pass__spec">
                  <strong>Night Shift</strong>
                  <span>Private table access</span>
                  <span>Pass 0001 / Active</span>
                </div>
              </header>

              <div class="night-pass__hero">
                <p>Cards against a sensible bedtime</p>
                <h1 id="night-shift-title">
                  <span>Pain</span>
                  <small>in my</small>
                  <span>Deck</span>
                </h1>
              </div>

              <p class="night-pass__tagline">A private card club for publicly bad ideas.</p>

              <div class="night-code-stripes" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span><span></span>
              </div>

              <div class="night-pass__entry">
                <div class="night-pass__entry-heading">
                  <span>Admit one</span>
                  <span>Door 01 / Online</span>
                </div>

                <label for="night-room-code">Five-character room code</label>
                <input
                  id="night-room-code"
                  :value="roomCode"
                  type="text"
                  inputmode="text"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  aria-describedby="night-room-help"
                  @input="updateRoomCode"
                />
                <p id="night-room-help">A–Z / 0–9 · exactly five characters</p>

                <button class="night-enter-button" type="submit">
                  <span>Enter the room</span><span aria-hidden="true">→</span>
                </button>
                <button class="night-new-button" type="button" @click="startNewGame">
                  Start a new game
                </button>

                <p class="night-pass__response" role="status" aria-live="polite" aria-atomic="true">
                  {{ announcement }}
                </p>
              </div>

              <footer class="night-pass__footer">
                <span>Members + invited trouble</span>
                <span>N02–PIMD–0001</span>
              </footer>
            </div>
          </form>
        </div>
      </section>

      <aside class="night-signal-rail" aria-hidden="true">
        <p>Channel N–02</p>
        <div class="night-signal-rail__blocks">
          <span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <p>Signal clear</p>
      </aside>

      <footer class="night-stage-footer">
        <span>House rule 01: commit to the bit</span>
        <span>New York / Anywhere · 2026</span>
      </footer>
    </main>
  `,
});

const meta = {
  title: 'Brand exploration/Shotgun 2/B — Night Shift',
  component: NightShiftHome,
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An energetic after-hours private card club built as a clipped vertical access pass, with a side-rail wordmark and hard-color signal language.',
      },
    },
  },
} satisfies Meta<typeof NightShiftHome>;

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
    const roomCodeInput = canvas.getByLabelText('Five-character room code');

    expect(roomCodeInput).toHaveValue('DECKS');
    await userEvent.clear(roomCodeInput);
    await userEvent.type(roomCodeInput, 'ab-12?c9');
    expect(roomCodeInput).toHaveValue('AB12C');

    await userEvent.click(canvas.getByRole('button', { name: 'Enter the room' }));
    expect(canvas.getByRole('status')).toHaveTextContent('Access confirmed. Joining room AB12C.');

    await userEvent.click(canvas.getByRole('button', { name: 'Start a new game' }));
    expect(canvas.getByRole('status')).toHaveTextContent('New game setup selected.');
  },
};

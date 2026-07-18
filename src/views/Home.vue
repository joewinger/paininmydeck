<template>
  <div id="home" class="pimd-screen home-screen">
    <section class="home-hero" aria-labelledby="home-title">
      <span class="home-edge-card home-edge-card--burst" aria-hidden="true">✱</span>
      <span class="home-edge-card home-edge-card--bolt" aria-hidden="true">ϟ</span>

      <header class="home-brand-lockup">
        <h1 id="home-title" class="home-title">
          <button
            class="home-mark-trigger"
            type="button"
            :aria-expanded="showVersion"
            aria-controls="home-version"
            @click="showVersion = !showVersion"
          >
            <product-mark variant="hero" />
            <span class="visually-hidden">Toggle build version</span>
          </button>
        </h1>
        <p class="home-tagline">Good company. Terrible answers.</p>
        <p v-if="showVersion" id="home-version" class="home-version">Build {{ commitHash }}</p>
      </header>

      <section class="pimd-paper home-join-sheet" aria-label="Join or start a game">
        <span class="pimd-tape home-join-tape" aria-hidden="true"></span>
        <span class="home-paper-punches" aria-hidden="true"></span>

        <room-code-input
          :model-value="roomId"
          :invalid="roomIdInvalid"
          @update:model-value="updateRoomId"
          @keyup.enter="joinRoom()"
        />

        <p class="home-join-status" role="status" aria-live="polite">
          {{ roomIdInvalid ? 'That room code needs five valid letters.' : '' }}
        </p>

        <button-loadable class="pimd-primary-button home-play-button" type="button" @click="joinRoom">
          Play
        </button-loadable>
        <button-loadable
          class="pimd-secondary-button home-tv-button"
          type="button"
          @click="openTv"
        >
          Use this screen as the TV
        </button-loadable>
        <button-loadable
          class="pimd-secondary-button home-new-game-button"
          type="button"
          @click="createRoom"
        >
          Start a new game
        </button-loadable>
      </section>
    </section>

    <section id="features" class="home-features" aria-labelledby="features-title">
      <div class="pimd-section-label">
        <h2 id="features-title">Built for bad ideas</h2>
      </div>
      <p class="home-features__intro">
        The familiar party-game setup, tuned for quick rooms and phones around the table.
      </p>
      <landing-carousel :slides-array="features" />
    </section>

    <footer class="home-footer">
      <product-mark variant="compact" />
      <div class="home-footer__legal">
        <span>Some things © 2022 paininmydeck.com</span>
        <span>
          In no way affiliated with
          <a href="https://www.cardsagainsthumanity.com/">Cards Against Humanity</a>.
        </span>
        <span>
          Card content is available under
          <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/">CC BY-NC-SA 2.0</a>.
        </span>
      </div>
      <a class="home-footer__contact" href="mailto:contact@paininmydeck.com">Reach out ↗</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ButtonLoadable from '@/components/ButtonLoadable.vue';
import LandingCarousel from '@/components/LandingCarousel.vue';
import ProductMark from '@/components/ProductMark.vue';
import RoomCodeInput from '@/components/RoomCodeInput.vue';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';
import { commitHash } from '@/config';
import { isRoomId, normalizeRoomId } from '@/shared/protocol';

const router = useRouter();
const game = useGameStore();
const ui = useUiStore();
const roomId = ref('');
const joinAttempted = ref(false);
const showVersion = ref(false);
const roomIdInvalid = computed(() => joinAttempted.value && !isRoomId(roomId.value));
const features = [
  {
    color: '#57cdbd',
    icon: 'shield-checkmark-outline',
    eyebrow: 'Keep it civil-ish',
    title: 'Family Mode',
    description:
      'Filter the rowdiest cards when the guest list includes kids, grandparents, or your boss.',
  },
  {
    color: '#a98af2',
    icon: 'create-outline',
    eyebrow: 'Write the punchline',
    title: 'Blank Cards',
    description: 'Add your own answer when the cards in your hand are not nearly weird enough.',
  },
  {
    color: '#ffd64a',
    icon: 'trash-outline',
    eyebrow: 'Not feeling it?',
    title: 'Card Trashing',
    description: 'Toss a dud, draw something new, and keep the round moving without ceremony.',
  },
  {
    color: '#72a9dc',
    icon: 'time-outline',
    eyebrow: 'Receipts included',
    title: 'Round History',
    description: 'Revisit old winners and settle the argument about who was actually funny.',
  },
];

function updateRoomId(value: string): void {
  roomId.value = value;
  joinAttempted.value = false;
}

function sanitizeRoomId(): void {
  roomId.value = normalizeRoomId(roomId.value)
    .replace(/[^A-HJ-NP-Z]/g, '')
    .slice(0, 5);
}

async function joinRoom(done: () => void = () => {}): Promise<void> {
  sanitizeRoomId();
  joinAttempted.value = true;
  try {
    if (!isRoomId(roomId.value)) {
      ui.notify({
        title: 'Invalid Room ID',
        message: 'Enter the five-letter room ID (without I or O).',
      });
      return;
    }
    await router.push({ name: 'lobby', params: { roomId: roomId.value } });
  } finally {
    done();
  }
}

async function openTv(done: () => void = () => {}): Promise<void> {
  sanitizeRoomId();
  joinAttempted.value = true;
  try {
    if (!isRoomId(roomId.value)) {
      ui.notify({
        title: 'Invalid Room ID',
        message: 'Enter the five-letter room ID before opening TV mode.',
      });
      return;
    }
    await router.push({ name: 'tv', params: { roomId: roomId.value } });
  } finally {
    done();
  }
}

async function createRoom(done: () => void = () => {}): Promise<void> {
  try {
    const id = await game.createRoom();
    await router.push({ name: 'lobby', params: { roomId: id } });
  } catch {
    // The store translates API failures into the existing toast surface.
  } finally {
    done();
  }
}
</script>

<style lang="scss">
.home-screen {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: max(760px, calc(100svh - var(--navbar-height)));
  padding: clamp(32px, 7vw, 76px) 16px 58px;
  border-bottom: 4px solid var(--pimd-ink);
  background:
    radial-gradient(circle at 18% 12%, rgb(255 255 255 / 80%), transparent 31%),
    transparent;
}

.home-brand-lockup {
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: end;
  margin-bottom: 36px;
}

.home-mark-trigger {
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.home-mark-trigger:hover,
.home-mark-trigger:active {
  transform: none;
  border: 0;
  background: transparent;
  color: inherit;
}

.home-title {
  margin: 0;
  font: inherit;
}

.home-tagline {
  position: relative;
  z-index: 0;
  margin: 22px 0 0;
  padding: 7px 12px 6px;
  transform: rotate(-1.4deg);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(14px, 4.3vw, 20px);
  line-height: 1;
  letter-spacing: -0.04em;
  text-align: center;
  white-space: nowrap;
}

.home-tagline::before {
  position: absolute;
  z-index: -1;
  inset: 0 -5px;
  transform: skew(-3deg);
  background: var(--pimd-meta);
  content: '';
  clip-path: polygon(1% 9%, 99% 0, 98% 90%, 2% 100%);
}

.home-version {
  margin: 12px 0 -25px;
  color: var(--pimd-ink-soft);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-join-sheet {
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: start;
  width: min(440px, calc(100vw - 28px));
  min-height: 386px;
  padding: 46px 24px 32px;
  transform: rotate(-0.55deg);
}

.home-join-tape {
  top: -7px;
  left: 52%;
  transform: rotate(-10deg);
  background: rgb(221 212 189 / 86%);
}

.home-paper-punches {
  position: absolute;
  top: -4px;
  right: 19px;
  left: 19px;
  height: 24px;
  background: radial-gradient(circle, var(--pimd-canvas) 0 7px, transparent 7.5px) 0 0 / 42px 24px
    repeat-x;
  filter: drop-shadow(1px 2px 1px rgb(45 37 64 / 20%));
}

.home-join-status {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 30px;
  margin: 4px 0 8px;
  color: var(--pimd-danger);
  font-family: 'Bungee', sans-serif;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
}

.home-join-sheet .home-play-button {
  min-height: 78px;
  font-size: clamp(34px, 10vw, 52px);
}

.home-join-sheet .home-tv-button {
  min-height: 56px;
  margin-top: 28px;
}

.home-join-sheet .home-new-game-button {
  min-height: 56px;
  margin-top: 12px;
}

.home-edge-card {
  position: absolute;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 105px;
  height: 158px;
  border: 4px solid var(--pimd-paper);
  border-radius: 9px;
  box-shadow: 0 3px 0 rgb(45 37 64 / 22%);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 72px;
}

.home-edge-card--burst {
  top: 24%;
  left: -70px;
  transform: rotate(-10deg);
  background: var(--pimd-primary);
}

.home-edge-card--bolt {
  top: 30%;
  right: -72px;
  transform: rotate(11deg);
  background: var(--pimd-highlight);
}

.home-features {
  display: grid;
  gap: 22px;
  padding: 72px 0 84px;
  background: var(--pimd-paper);
}

.home-features__intro {
  width: min(560px, calc(100% - 40px));
  margin: 0 auto;
  color: var(--pimd-ink-soft);
  font-size: clamp(15px, 3vw, 18px);
  font-weight: 700;
  line-height: 1.55;
  text-align: center;
}

.home-footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 28px;
  align-items: start;
  padding: 42px max(24px, calc((100vw - 1100px) / 2));
  border-top: 5px solid var(--pimd-primary);
  background: var(--pimd-ink);
  color: var(--pimd-paper);
}

.home-footer .pimd-product-mark {
  --pimd-mark-card-text: var(--pimd-ink);

  color: var(--pimd-paper);
}

.home-footer__legal {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: rgb(255 250 240 / 75%);
  font-size: 11px;
  line-height: 1.45;
}

.home-footer a {
  color: var(--pimd-paper);
  font-style: normal;
  text-decoration: underline;
  text-decoration-color: var(--pimd-primary);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.home-footer__contact {
  font-family: 'Bungee', sans-serif;
  font-size: 12px;
  text-transform: uppercase;
  white-space: nowrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 850px) {
  .home-hero {
    grid-template-columns: minmax(280px, 0.88fr) minmax(420px, 1fr);
    gap: clamp(42px, 8vw, 120px);
    align-content: center;
    min-height: calc(100svh - var(--navbar-height));
    padding-right: max(48px, calc((100vw - 1080px) / 2));
    padding-left: max(48px, calc((100vw - 1080px) / 2));
  }

  .home-brand-lockup,
  .home-join-sheet {
    align-self: center;
    margin: 0;
  }

  .home-edge-card--burst {
    top: 18%;
  }

  .home-edge-card--bolt {
    top: 20%;
  }
}

@media (max-width: 700px) {
  .home-footer {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 34px 24px;
  }

  .home-footer__contact {
    justify-self: start;
  }
}

@media (max-width: 390px) {
  .home-join-sheet {
    padding-right: 18px;
    padding-left: 18px;
  }

  .home-tagline {
    font-size: 13px;
  }
}
</style>

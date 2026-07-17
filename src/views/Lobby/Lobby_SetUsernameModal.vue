<template>
  <transition appear name="modal">
    <div id="modalWrapper">
      <section
        id="setUsernameModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        <article class="pimd-paper profile-intro">
          <span class="pimd-tape profile-intro__tape" aria-hidden="true"></span>
          <product-mark variant="compact" />
          <p class="pimd-eyebrow">New player / Room {{ game.roomId ?? '-----' }}</p>
          <h1 id="profile-title">Pick your table name</h1>
          <p>This is what everyone will call you when your answer causes trouble.</p>
          <span class="profile-intro__note" aria-hidden="true">Good company → bad ideas</span>
        </article>

        <form class="pimd-paper profile-form" @submit.prevent="addUser">
          <div class="profile-field">
            <label for="profile-name">Call sign</label>
            <input
              id="profile-name"
              v-model="username"
              type="text"
              placeholder="What should we call you?"
              maxlength="12"
              autocomplete="nickname"
              aria-describedby="profile-name-help"
              autofocus
            />
            <small id="profile-name-help">Up to 12 characters. Make it recognizable.</small>
          </div>

          <fieldset id="colorSelector">
            <legend>Pick a card color</legend>
            <div role="radiogroup" aria-label="Card color">
              <button
                v-for="color in colorSets"
                :key="color.value"
                type="button"
                role="radio"
                class="swatch"
                :class="{
                  taken: game.usedColorSets.includes(color.value),
                  selected: myColorSet === color.value,
                }"
                :style="{
                  '--color-from': color.value.split(',')[0],
                  '--color-to': color.value.split(',')[1],
                }"
                :disabled="game.usedColorSets.includes(color.value)"
                :aria-checked="myColorSet === color.value"
                :aria-label="`${color.name}${game.usedColorSets.includes(color.value) ? ', taken' : ''}`"
                @click="selectColor(color.value)"
              >
                <span aria-hidden="true">✱</span>
              </button>
            </div>
          </fieldset>

          <button class="pimd-primary-button" type="submit">Set Username</button>
        </form>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ProductMark from '@/components/ProductMark.vue';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';

const game = useGameStore();
const ui = useUiStore();
const username = ref(rememberedUsername());
const colorSets = [
  { name: 'Coral', value: '#EE796E,#FAB4AD' },
  { name: 'Peach', value: '#F2A971,#FCD4B5' },
  { name: 'Gold', value: '#F4C876,#FDE6B9' },
  { name: 'Meadow', value: '#ADD787,#CAEBAD' },
  { name: 'Mint', value: '#65C294,#96DFBB' },
  { name: 'Sky', value: '#5E87C5,#8FAFE0' },
  { name: 'Indigo', value: '#5561AF,#808BD0' },
  { name: 'Lavender', value: '#7E67AF,#A793D2' },
  { name: 'Rose', value: '#BE7CB5,#DEABD7' },
] as const;
const myColorSet = ref<string | null>(null);

function rememberedUsername(): string {
  try {
    const sessionName = sessionStorage.getItem('username');
    if (sessionName) return sessionName;
  } catch {
    // Storage is optional in hardened/private browser contexts.
  }
  try {
    return localStorage.getItem('username') ?? '';
  } catch {
    return '';
  }
}

function selectColor(colorSet: string) {
  if (!game.usedColorSets.includes(colorSet)) myColorSet.value = colorSet;
}

async function addUser() {
  const displayName = username.value.trim();
  if (!displayName) {
    ui.notify({ message: 'Username can not be blank!', title: 'Invalid Username' });
    return;
  }
  if (
    game.users.some(
      (user) => user.displayName.toLocaleLowerCase() === displayName.toLocaleLowerCase(),
    )
  ) {
    ui.notify({
      message: `The username ${displayName} has already been taken!`,
      title: 'Invalid Username',
    });
    username.value = '';
    return;
  }
  if (displayName.length > 12) {
    ui.notify({
      message: `The username ${displayName} is too long! 12 characters max, please :)`,
      title: 'Invalid Username',
    });
    return;
  }

  if (myColorSet.value === null) {
    const available = colorSets.filter(
      (colorSet) => !game.usedColorSets.includes(colorSet.value),
    );
    myColorSet.value = available[Math.floor(Math.random() * available.length)]?.value ?? null;
  }
  if (!myColorSet.value) {
    ui.notify({ message: 'This room has no player colors left.', title: 'Room Full' });
    return;
  }
  const [from, to] = myColorSet.value.split(',');
  try {
    await game.setProfile(displayName, [from, to]);
  } catch {
    // The store reports profile failures and exits terminal provisional sessions.
  }
}
</script>

<style scoped>
#modalWrapper {
  position: fixed;
  inset: 0;
  z-index: 2500;
  overflow-y: auto;
  padding: 22px 14px 96px;
  background-color: var(--pimd-canvas);
  background-image:
    linear-gradient(rgb(87 169 191 / 10%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(87 169 191 / 10%) 1px, transparent 1px);
  background-size: 26px 26px;
  transition: opacity 220ms ease;
}

#setUsernameModal {
  display: grid;
  align-content: start;
  gap: 20px;
  width: min(100%, 1040px);
  margin: 0 auto;
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.profile-intro,
.profile-form {
  width: min(100%, 620px);
  margin-inline: auto;
}

.profile-intro {
  padding: 37px 24px 31px;
  transform: rotate(-0.65deg);
}

.profile-intro__tape {
  top: -7px;
  left: 52%;
  transform: translateX(-50%) rotate(-8deg);
}

.profile-intro .pimd-product-mark {
  width: fit-content;
  margin: 0 0 25px;
  padding: 7px 10px 6px;
  transform: rotate(-1deg);
  background: var(--pimd-highlight);
}

.profile-intro h1 {
  max-width: 12ch;
  margin: 12px 0 16px;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(37px, 11vw, 62px);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.045em;
  text-transform: uppercase;
}

.profile-intro > p:not(.pimd-eyebrow) {
  max-width: 40ch;
  margin: 0;
  color: var(--pimd-ink-soft);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.4;
}

.profile-intro__note {
  display: block;
  width: fit-content;
  margin: 22px 0 0 auto;
  padding: 7px 10px 6px;
  transform: rotate(-2deg);
  background: var(--pimd-meta);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 10px;
  line-height: 1;
  text-transform: uppercase;
}

.profile-form {
  display: grid;
  gap: 20px;
  padding: 32px 22px 34px;
  transform: rotate(0.4deg);
}

.profile-field {
  display: grid;
  gap: 9px;
}

.profile-field label,
#colorSelector legend {
  width: fit-content;
  padding: 7px 10px 6px;
  background: var(--pimd-primary);
  color: var(--pimd-on-primary);
  font-family: 'Bungee', sans-serif;
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
}

.profile-field input {
  width: 100%;
  min-height: 58px;
  padding: 12px 14px;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper);
  color: var(--pimd-ink);
  font-size: 18px;
  font-weight: 800;
  text-align: left;
}

.profile-field input::placeholder {
  color: var(--pimd-ink-soft);
  opacity: 0.65;
}

.profile-field small {
  color: var(--pimd-ink-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
}

#colorSelector {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

#colorSelector > div {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 11px;
}

#colorSelector .swatch {
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 52px;
  margin: 0;
  padding: 5px;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: linear-gradient(135deg, var(--color-from) 0 50%, var(--color-to) 50% 100%);
  box-shadow: 3px 4px 0 rgb(45 37 64 / 28%);
  color: var(--pimd-ink);
  font-size: 25px;
  line-height: 1;
}

#colorSelector .swatch:not(:disabled):hover {
  transform: translateY(-2px) rotate(-1deg);
  border-color: var(--pimd-ink);
  color: var(--pimd-ink);
}

#colorSelector .swatch.taken,
#colorSelector .swatch:disabled {
  position: relative;
  border-color: var(--pimd-ink);
  background: linear-gradient(135deg, var(--color-from) 0 50%, var(--color-to) 50% 100%);
  color: var(--pimd-ink);
  cursor: not-allowed;
  filter: grayscale(0.7);
  opacity: 0.36;
}

#colorSelector .swatch.selected {
  transform: translate(3px, 4px) rotate(-2deg);
  border-color: var(--pimd-paper);
  box-shadow: 0 0 0 4px var(--pimd-primary);
}

.profile-form .pimd-primary-button {
  margin-top: 2px;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from #setUsernameModal,
.modal-leave-to #setUsernameModal {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

@media (min-width: 860px) {
  #modalWrapper {
    display: grid;
    align-items: center;
    padding: clamp(34px, 6vh, 70px) clamp(34px, 6vw, 92px);
  }

  #setUsernameModal {
    grid-template-columns: minmax(300px, 0.86fr) minmax(380px, 1.14fr);
    align-items: center;
    gap: clamp(28px, 5vw, 68px);
  }

  .profile-intro,
  .profile-form {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .profile-intro {
    min-height: 500px;
    padding: 54px 40px 40px;
  }

  .profile-intro h1 {
    font-size: clamp(52px, 5vw, 72px);
  }

  .profile-form {
    padding: 40px 38px 38px;
  }
}

@media (min-width: 1000px) {
  #colorSelector > div {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (forced-colors: active) {
  #colorSelector .swatch,
  #colorSelector .swatch:disabled,
  .profile-field input {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
    filter: none;
  }
}
</style>

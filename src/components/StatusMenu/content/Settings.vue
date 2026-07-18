<template>
  <section
    id="statusMenuContent-settings"
    class="statusMenuContent"
    aria-labelledby="room-settings-title"
  >
    <h1 id="room-settings-title">Settings</h1>
    <table>
      <caption class="settings-table-caption">
        Game settings for this room
      </caption>
      <tbody>
        <tr>
          <th scope="row"><label for="action-timer">Action Timer</label></th>
          <td>
            <input
              id="action-timer"
              v-model.number="actionTimerSeconds"
              type="number"
              min="0"
              max="120"
              :disabled="!canEdit"
              aria-describedby="action-timer-hint"
            />
            <small id="action-timer-hint">seconds · 0 = off</small>
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="cards-per-hand">Cards Per Hand</label></th>
          <td>
            <input
              id="cards-per-hand"
              v-model.number="cardsPerHand"
              type="number"
              min="3"
              max="30"
              :disabled="!canEdit"
            />
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="points-to-win">Points To Win</label></th>
          <td>
            <input
              id="points-to-win"
              v-model.number="pointsToWin"
              type="number"
              min="1"
              max="100"
              :disabled="!canEdit"
            />
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="blank-cards">Deck Blank Cards</label></th>
          <td>
            <input
              id="blank-cards"
              v-model.number="numBlankCards"
              type="number"
              min="0"
              max="2000"
              :disabled="!canEdit"
            />
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="guaranteed-blanks">Guaranteed Blanks</label></th>
          <td>
            <input
              id="guaranteed-blanks"
              v-model.number="guaranteedBlanks"
              type="number"
              min="0"
              :max="cardsPerHand"
              :disabled="!canEdit"
            />
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="all-blanks">All blanks!</label></th>
          <td>
            <div class="settings-toggle-control">
              <input
                id="all-blanks"
                v-model="allBlanks"
                class="settings-toggle"
                type="checkbox"
                :disabled="!canEdit"
              />
              <span class="settings-toggle-state" aria-hidden="true">
                {{ allBlanks ? 'On' : 'Off' }}
              </span>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="family-mode">Family mode</label></th>
          <td>
            <div class="settings-toggle-control">
              <input
                id="family-mode"
                v-model="familyMode"
                class="settings-toggle"
                type="checkbox"
                :disabled="!canEdit"
              />
              <span class="settings-toggle-state" aria-hidden="true">
                {{ familyMode ? 'On' : 'Off' }}
              </span>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row"><label for="allowed-redraws">Allowed Re-draws</label></th>
          <td>
            <input
              id="allowed-redraws"
              v-model.number="numRedraws"
              type="number"
              min="0"
              max="30"
              :disabled="!canEdit"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <button
      v-if="canEdit"
      type="button"
      class="status-menu-action"
      @click="updateSettings"
    >
      Save
    </button>

    <section class="settings-device" aria-labelledby="device-settings-title">
      <h2 id="device-settings-title">This device</h2>
      <div class="settings-device-row">
        <div>
          <label for="haptics-enabled">Haptics</label>
          <small id="haptics-hint">
            Vibrate when you become Czar or your action timer is running out.
          </small>
        </div>
        <div class="settings-toggle-control">
          <input
            id="haptics-enabled"
            v-model="hapticsEnabled"
            class="settings-toggle"
            type="checkbox"
            aria-describedby="haptics-hint device-settings-note"
          />
          <span class="settings-toggle-state" aria-hidden="true">
            {{ hapticsEnabled ? 'On' : 'Off' }}
          </span>
        </div>
      </div>

      <div class="settings-device-row settings-device-row--sound">
        <div>
          <label for="sound-enabled">Sound effects</label>
          <small id="sound-effects-hint">
            Confirm card plays, celebrate winners, and flag hidden chat messages.
          </small>
        </div>
        <div class="settings-toggle-control">
          <input
            id="sound-enabled"
            v-model="soundEnabled"
            class="settings-toggle"
            type="checkbox"
            aria-describedby="sound-effects-hint device-settings-note"
          />
          <span class="settings-toggle-state" aria-hidden="true">
            {{ soundEnabled ? 'On' : 'Muted' }}
          </span>
        </div>
      </div>

      <div class="settings-volume">
        <label for="sound-volume">
          Volume
          <output for="sound-volume">{{ soundVolumePercent }}%</output>
        </label>
        <input
          id="sound-volume"
          v-model.number="soundVolumePercent"
          type="range"
          min="0"
          max="100"
          step="5"
          :disabled="!soundEnabled"
          aria-label="Sound volume"
          :aria-valuetext="`${soundVolumePercent}%`"
          aria-describedby="sound-effects-hint device-settings-note"
        />
      </div>
      <p id="device-settings-note">Saved only in this browser.</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUiStore } from '@/stores/ui';
import type { GameSettings } from '@/shared/protocol';

const emit = defineEmits<{ 'close-menu': [] }>();
const game = useGameStore();
const ui = useUiStore();
const canEdit = computed(() => game.self !== null && game.phase === 'LOBBY');
const changedActionTimerSeconds = ref<number | null>(null);
const changedCardsPerHand = ref<number | null>(null);
const changedPointsToWin = ref<number | null>(null);
const changedNumBlankCards = ref<number | null>(null);
const changedGuaranteedBlanks = ref<number | null>(null);
const changedNumRedraws = ref<number | null>(null);
const changedAllBlanks = ref<boolean | null>(null);
const changedFamilyMode = ref<boolean | null>(null);
const hapticsEnabled = computed<boolean>({
  get: () => ui.hapticsEnabled,
  set: (enabled) => ui.setHapticsEnabled(enabled),
});
const soundEnabled = computed<boolean>({
  get: () => !ui.soundMuted,
  set: (enabled) => ui.setSoundMuted(!enabled),
});
const soundVolumePercent = computed<number>({
  get: () => ui.soundVolumePercent,
  set: (volumePercent) => ui.setSoundVolumePercent(volumePercent),
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

const cardsPerHand = computed<number>({
  get: () => changedCardsPerHand.value ?? game.settings.cardsPerHand,
  set: (value) => {
    changedCardsPerHand.value = clamp(value, 3, 30);
  },
});
const actionTimerSeconds = computed<number>({
  get: () => changedActionTimerSeconds.value ?? game.settings.actionTimerSeconds,
  set: (value) => {
    const numeric = Number(value) || 0;
    changedActionTimerSeconds.value = numeric <= 0 ? 0 : clamp(numeric, 5, 120);
  },
});
const pointsToWin = computed<number>({
  get: () => changedPointsToWin.value ?? game.settings.pointsToWin,
  set: (value) => {
    changedPointsToWin.value = clamp(value, 1, 100);
  },
});
const numBlankCards = computed<number>({
  get: () => changedNumBlankCards.value ?? game.settings.numBlankCards,
  set: (value) => {
    changedNumBlankCards.value = clamp(value, 0, 2_000);
  },
});
const guaranteedBlanks = computed<number>({
  get: () => changedGuaranteedBlanks.value ?? game.settings.guaranteedBlanks,
  set: (value) => {
    changedGuaranteedBlanks.value = clamp(value, 0, cardsPerHand.value);
  },
});
const numRedraws = computed<number>({
  get: () => changedNumRedraws.value ?? game.settings.numRedraws,
  set: (value) => {
    changedNumRedraws.value = clamp(value, 0, 30);
  },
});
const allBlanks = computed<boolean>({
  get: () => changedAllBlanks.value ?? game.settings.allBlanks,
  set: (value) => {
    changedAllBlanks.value = value;
  },
});
const familyMode = computed<boolean>({
  get: () => changedFamilyMode.value ?? game.settings.familyMode,
  set: (value) => {
    changedFamilyMode.value = value;
  },
});

async function updateSettings() {
  if (!canEdit.value) return;
  const settings: GameSettings = {
    actionTimerSeconds: actionTimerSeconds.value,
    cardsPerHand: cardsPerHand.value,
    pointsToWin: pointsToWin.value,
    numBlankCards: numBlankCards.value,
    guaranteedBlanks: Math.min(guaranteedBlanks.value, cardsPerHand.value),
    numRedraws: numRedraws.value,
    allBlanks: allBlanks.value,
    familyMode: familyMode.value,
  };
  try {
    await game.updateSettings(settings);
    emit('close-menu');
  } catch {
    // The store reports command failures in the existing toast.
  }
}
</script>

<style>
#statusMenuContent-settings {
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-direction: column;
}

#statusMenuContent-settings table th {
  width: auto;
  padding-right: 12px;
}

#statusMenuContent-settings table td {
  width: 118px;
  text-align: right;
}

#statusMenuContent-settings input[type='number'] {
  width: 76px;
  min-height: 40px;
  margin: 0;
  padding: 6px 7px;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper);
  box-shadow: 2px 3px 0 var(--pimd-meta);
  color: var(--pimd-ink);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 900;
  text-align: right;
  appearance: textfield;
}

#statusMenuContent-settings small {
  display: block;
  margin-top: 5px;
  color: var(--pimd-ink-soft);
  font-size: 0.63rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

#statusMenuContent-settings input[type='number']::-webkit-outer-spin-button,
#statusMenuContent-settings input[type='number']::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

#statusMenuContent-settings input:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

#statusMenuContent-settings .settings-toggle {
  display: inline-grid;
  width: 54px;
  height: 30px;
  min-height: 30px;
  margin: 0;
  padding: 2px;
  border: 3px solid var(--pimd-ink);
  border-radius: 0;
  background: var(--pimd-paper-shadow);
  color: var(--pimd-ink);
  cursor: pointer;
  appearance: none;
}

#statusMenuContent-settings .settings-toggle::before {
  content: '';
  width: 20px;
  height: 20px;
  transform: translateX(0) rotate(-3deg);
  background: var(--pimd-ink-soft);
  transition:
    transform 120ms ease,
    background-color 120ms ease;
}

#statusMenuContent-settings .settings-toggle:checked {
  background: var(--pimd-status);
}

#statusMenuContent-settings .settings-toggle:checked::before {
  transform: translateX(24px) rotate(3deg);
  background: var(--pimd-highlight);
}

#statusMenuContent-settings .settings-toggle-control {
  display: inline-grid;
  grid-template-columns: 54px 40px;
  gap: 7px;
  align-items: center;
  justify-content: end;
}

#statusMenuContent-settings .settings-toggle-state {
  display: grid;
  min-height: 28px;
  place-items: center;
  padding: 5px 4px 4px;
  border: 3px solid var(--pimd-ink);
  background: var(--pimd-paper-shadow);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.58rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

#statusMenuContent-settings .settings-toggle:checked + .settings-toggle-state {
  background: var(--pimd-status);
}

#statusMenuContent-settings .settings-toggle:disabled + .settings-toggle-state {
  opacity: 0.58;
}

#statusMenuContent-settings .settings-device {
  display: grid;
  gap: 10px;
  margin-top: 23px;
  padding-top: 18px;
  border-top: 3px dashed rgb(45 37 64 / 30%);
}

#statusMenuContent-settings .settings-device h2 {
  margin: 0;
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: 0.86rem;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

#statusMenuContent-settings .settings-device-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

#statusMenuContent-settings .settings-device-row label {
  display: block;
  font-weight: 850;
}

#statusMenuContent-settings .settings-device-row small {
  max-width: 230px;
  margin-top: 6px;
  line-height: 1.25;
  white-space: normal;
}

#statusMenuContent-settings .settings-device-row--sound {
  padding-top: 12px;
  border-top: 2px dashed rgb(45 37 64 / 22%);
}

#statusMenuContent-settings .settings-device-row--sound .settings-toggle-control {
  grid-template-columns: 54px 48px;
}

#statusMenuContent-settings .settings-volume {
  display: grid;
  gap: 8px;
  padding: 2px 0 4px;
}

#statusMenuContent-settings .settings-volume label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-weight: 850;
}

#statusMenuContent-settings .settings-volume output {
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 900;
}

#statusMenuContent-settings input[type='range'] {
  width: 100%;
  height: 28px;
  margin: 0;
  accent-color: var(--pimd-primary-dark);
  cursor: pointer;
}

#statusMenuContent-settings input[type='range']:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

#statusMenuContent-settings .settings-device p {
  margin: 0;
  color: var(--pimd-ink-soft);
  font-size: 0.68rem;
  font-weight: 750;
}

.settings-table-caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 360px) {
  #statusMenuContent-settings table th,
  #statusMenuContent-settings table td {
    padding-block: 8px;
  }

  #statusMenuContent-settings table th {
    font-size: 0.84rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  #statusMenuContent-settings .settings-toggle::before {
    transition-duration: 0.01ms;
  }
}

@media (forced-colors: active) {
  #statusMenuContent-settings input[type='number'],
  #statusMenuContent-settings input[type='range'],
  #statusMenuContent-settings .settings-toggle,
  #statusMenuContent-settings .settings-toggle-state,
  #statusMenuContent-settings .settings-toggle:checked + .settings-toggle-state {
    border-color: FieldText;
    background: Field;
    box-shadow: none;
    color: FieldText;
    forced-color-adjust: auto;
  }
}
</style>

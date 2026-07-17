<template>
  <div class="pimd-room-code">
    <label :for="inputId">{{ label }}</label>
    <div class="pimd-room-code__control" :class="{ 'pimd-room-code__control--invalid': invalid }">
      <input
        :id="inputId"
        class="pimd-room-code__input"
        :value="modelValue"
        type="text"
        inputmode="text"
        maxlength="5"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        :aria-invalid="invalid"
        :aria-describedby="helpId"
        @input="updateValue"
      />
      <span v-for="(character, index) in characters" :key="index" aria-hidden="true">
        {{ character }}
      </span>
    </div>
    <span class="pimd-room-code__underline" aria-hidden="true"></span>
    <small :id="helpId">Five letters. No I, O, or numbers.</small>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { normalizeRoomId } from '@/shared/protocol';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    invalid?: boolean;
  }>(),
  {
    label: 'Enter room code',
    invalid: false,
  },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const uid = useId();
const inputId = `pimd-room-code-${uid}`;
const helpId = `${inputId}-help`;
const characters = computed(() =>
  Array.from({ length: 5 }, (_, index) => props.modelValue[index] ?? ''),
);

function updateValue(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  const normalized = normalizeRoomId(input.value)
    .replace(/[^A-HJ-NP-Z]/g, '')
    .slice(0, 5);
  input.value = normalized;
  emit('update:modelValue', normalized);
}
</script>

<style scoped>
.pimd-room-code {
  display: grid;
  gap: 10px;
  width: 100%;
}

.pimd-room-code label {
  justify-self: center;
  padding: 7px 11px 6px;
  transform: rotate(-0.7deg);
  background: var(--pimd-primary);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(11px, 3.2vw, 15px);
  line-height: 1;
  text-transform: uppercase;
}

.pimd-room-code__control {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.pimd-room-code__input {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  opacity: 0;
  cursor: text;
}

.pimd-room-code__control > span {
  display: grid;
  place-items: center;
  min-width: 0;
  aspect-ratio: 0.82;
  border: 3px solid var(--pimd-ink);
  background: rgb(255 250 240 / 72%);
  box-shadow: 3px 4px 0 rgb(45 37 64 / 22%);
  color: var(--pimd-ink);
  font-family: 'Bungee', sans-serif;
  font-size: clamp(20px, 7vw, 34px);
  line-height: 1;
}

.pimd-room-code__control:focus-within > span {
  border-color: var(--pimd-ink);
  background: var(--pimd-paper);
  box-shadow: 0 0 0 4px var(--pimd-highlight);
}

.pimd-room-code__control--invalid > span {
  border-color: var(--pimd-danger);
}

.pimd-room-code__underline {
  width: 91%;
  height: 4px;
  margin: -3px auto 0;
  transform: rotate(-1.5deg);
  background: var(--pimd-primary-dark);
}

.pimd-room-code__control--invalid + .pimd-room-code__underline {
  background: var(--pimd-danger);
}

.pimd-room-code small {
  color: var(--pimd-ink-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}

@media (forced-colors: active) {
  .pimd-room-code__input {
    opacity: 1;
    color: transparent;
    caret-color: CanvasText;
    background: transparent;
  }
}
</style>

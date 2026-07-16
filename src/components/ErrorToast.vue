<template>
  <transition appear name="toast">
    <div v-if="ui.error.message" id="errorToast" role="alert" aria-live="assertive">
      <span class="errorToast__eyebrow">Heads up</span>
      <strong class="errorToast__title">{{ ui.error.title }}</strong>
      <span class="errorToast__message">{{ ui.error.message }}</span>
      <button type="button" aria-label="Dismiss notification" @click="ui.closeNotification">
        ×
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
</script>

<style scoped>
#errorToast {
  position: fixed;
  right: 14px;
  bottom: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 20px;
  width: min(420px, calc(100vw - 28px));
  padding: 23px 58px 22px 25px;
  transform: rotate(-0.35deg);
  border: 4px solid var(--pimd-ink);
  background:
    linear-gradient(rgb(87 169 191 / 14%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(87 169 191 / 14%) 1px, transparent 1px),
    var(--pimd-paper);
  background-size: 18px 18px;
  box-shadow: 7px 9px 0 var(--pimd-action);
  color: var(--pimd-ink);
  transition:
    transform 220ms ease,
    opacity 220ms ease;
  z-index: 2900;
}

.errorToast__eyebrow {
  grid-column: 1;
  justify-self: start;
  padding: 5px 8px 4px;
  transform: rotate(-1deg);
  background: var(--pimd-highlight);
  font-family: 'Bungee', sans-serif;
  font-size: 9px;
  line-height: 1;
  text-transform: uppercase;
}

.errorToast__title,
.errorToast__message {
  grid-column: 1;
}

.errorToast__title {
  margin-top: 5px;
  font-family: 'Bungee', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.1;
  text-transform: uppercase;
}

.errorToast__message {
  color: var(--pimd-ink-soft);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

#errorToast button {
  position: absolute;
  top: 15px;
  right: 15px;
  display: grid;
  place-items: center;
  width: 34px;
  min-height: 34px;
  margin: 0;
  padding: 0;
  border: 3px solid var(--pimd-ink);
  border-radius: 50%;
  background: var(--pimd-action);
  color: var(--pimd-paper);
  font-family: 'Bungee', sans-serif;
  font-size: 20px;
  line-height: 1;
}

#errorToast button:hover {
  transform: rotate(6deg);
  border-color: var(--pimd-ink);
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(35px) rotate(2deg);
  opacity: 0;
}

@media (max-width: 540px) {
  #errorToast {
    right: 14px;
    bottom: calc(14px + env(safe-area-inset-bottom));
  }
}
</style>

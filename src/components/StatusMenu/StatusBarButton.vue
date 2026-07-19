<template>
  <button
    ref="button"
    type="button"
    class="statusBarButton"
    :class="{ active, notification }"
    :aria-label="accessibleLabel"
    :aria-pressed="active"
    :aria-controls="controls"
    :aria-expanded="expanded"
    @click="$emit('click', $event)"
  >
    <span class="statusBarButton__icon" aria-hidden="true">
      <slot></slot>
    </span>
    <span class="statusBarButton__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    notification?: boolean;
    controls?: string;
    expanded?: boolean;
  }>(),
  {
    active: false,
    notification: false,
    controls: undefined,
    expanded: undefined,
  },
);

defineEmits<{ click: [event: MouseEvent] }>();
const button = ref<HTMLButtonElement | null>(null);

const accessibleLabel = computed(() =>
  props.notification ? `${props.label}, unread messages` : props.label,
);

defineExpose({ focus: () => button.value?.focus() });
</script>

<style scoped>
.statusBarButton {
  position: relative;
  display: grid;
  grid-template-rows: 24px auto;
  place-items: center;
  gap: 2px;
  width: 100%;
  min-width: 0;
  max-width: none;
  min-height: 57px;
  margin: 0;
  padding: 5px 6px 4px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--pimd-ink-soft);
  line-height: 1;
  transition:
    transform 120ms ease,
    background-color 120ms ease,
    color 120ms ease;
}

.statusBarButton + .statusBarButton {
  border-left: 2px dotted rgb(45 37 64 / 32%);
}

.statusBarButton:hover {
  transform: none;
  background: rgb(255 214 74 / 38%);
  color: var(--pimd-ink);
}

.statusBarButton:active {
  transform: none;
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.statusBarButton.active {
  background: var(--pimd-highlight);
  color: var(--pimd-ink);
}

.statusBarButton.active:not(:first-child),
.statusBarButton.active + .statusBarButton {
  border-left: 3px solid var(--pimd-ink);
}

.statusBarButton.active::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: var(--pimd-primary-dark);
}

.statusBarButton__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
}

.statusBarButton__label {
  overflow: hidden;
  max-width: 100%;
  font-family: 'Bungee', sans-serif;
  font-size: 8px;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.statusBarButton.notification::after {
  content: '';
  position: absolute;
  top: 5px;
  left: calc(50% + 7px);
  width: 10px;
  height: 10px;
  border: 2px solid var(--pimd-paper);
  border-radius: 50%;
  background: var(--pimd-highlight);
  box-shadow: 1px 1px 0 var(--pimd-ink);
  animation: status-notification-pulse 2.8s 3 ease-in-out;
}

@keyframes status-notification-pulse {
  0%,
  65%,
  100% {
    transform: scale(1);
  }

  75% {
    transform: scale(1.45) rotate(10deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .statusBarButton,
  .statusBarButton.notification::after {
    transition-duration: 0.01ms;
    animation: none;
  }
}

@media (forced-colors: active) {
  .statusBarButton,
  .statusBarButton.active {
    border-color: ButtonText;
    background: ButtonFace;
    color: ButtonText;
  }

  .statusBarButton.notification::after {
    border-color: Canvas;
    background: Highlight;
    box-shadow: none;
  }
}
</style>

<template>
  <figure
    class="room-qr-code"
    :style="{ '--room-qr-size': `${size}px` }"
    :data-join-url="joinUrl"
  >
    <div class="room-qr-code__image" aria-hidden="true">
      <qrcode-svg
        :value="joinUrl"
        :size="size"
        :margin="4"
        level="M"
        background="#ffffff"
        foreground="#2d2540"
      />
    </div>
    <figcaption>
      <strong>Scan to join on your phone</strong>
      <a :href="joinUrl">{{ displayUrl }}</a>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { QrcodeSvg } from 'qrcode.vue';

const props = withDefaults(defineProps<{ roomId: string; size?: number }>(), {
  size: 300,
});

const joinUrl = computed(() => {
  const path = `/join/${encodeURIComponent(props.roomId)}`;
  return new URL(path, window.location.origin).toString();
});
const displayUrl = computed(() => joinUrl.value.replace(/^https?:\/\//, '').replace(/\/$/, ''));

defineExpose({ joinUrl });
</script>

<style scoped>
.room-qr-code {
  display: grid;
  justify-items: center;
  gap: 14px;
  width: min(100%, calc(var(--room-qr-size) + 32px));
  margin: 0;
}

.room-qr-code__image {
  display: grid;
  width: min(100%, var(--room-qr-size));
  padding: 10px;
  border: 4px solid var(--pimd-ink);
  background: #fff;
  box-shadow: 7px 8px 0 var(--pimd-meta);
}

.room-qr-code__image :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.room-qr-code figcaption {
  display: grid;
  justify-items: center;
  gap: 5px;
  max-width: 100%;
  color: var(--pimd-ink);
  text-align: center;
}

.room-qr-code figcaption strong {
  font-family: 'Bungee', sans-serif;
  font-size: clamp(12px, 1.5vw, 18px);
  font-weight: 400;
  line-height: 1.15;
  text-transform: uppercase;
}

.room-qr-code figcaption a {
  max-width: 100%;
  overflow: hidden;
  border-bottom-color: var(--pimd-primary);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: clamp(10px, 1vw, 14px);
  font-style: normal;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (forced-colors: active) {
  .room-qr-code__image {
    border-color: CanvasText;
    box-shadow: none;
  }
}
</style>

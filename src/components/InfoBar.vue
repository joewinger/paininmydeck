<template>
  <p id="infoBar" class="pimd-status-strip" role="status" aria-live="polite" aria-atomic="true">
    <span aria-hidden="true">↻</span>
    {{ text }}
  </p>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<style scoped>
#infoBar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 42px;
  font-size: 12px;
}

#infoBar span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 2px solid var(--pimd-ink);
  border-radius: 50%;
  font-family: 'Bungee', sans-serif;
  font-size: 13px;
  line-height: 1;
}
</style>

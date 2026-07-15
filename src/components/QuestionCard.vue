<template>
  <div :class="{'questionCard': true, 'sticky': sticky }"
  @click="toggleSticky()"
  :style="{
    '--gradient-from': game.czarColorSet[0],
    '--gradient-to': game.czarColorSet[1]
  }">
    {{ blankify(text) }}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { blankify } from '@/shared/protocol';

defineProps<{ text: string }>();
const game = useGameStore();
const sticky = ref(true);

function toggleSticky() {
	sticky.value = !sticky.value;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.questionCard {
  display: flex;
  align-items: flex-end;
  
  width: min(350px, 95vw);
  min-height: 210px;
	padding: 50px 15px 15px 15px;
  margin-top: var(--content-gutter-top);
	margin-bottom: 10px;
  
  background-image: linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-to) 100%);
  border-radius: 15px;
  border: 4px solid #0E0E0E22;
  background-origin: border-box;
  /* box-shadow: 0px 2px 4px rgba(69, 134, 96, 0.52); */
  
  color: #fff;
  font-family: aktiv-grotesk, Helvetica, sans-serif;
  /* font-size: 30px; */
  font-size: 20pt;
	font-weight: 700;
	text-align: left;

  z-index: 1800;
}

.questionCard.sticky {
  position: -webkit-sticky;
  position: sticky;
  top: calc( var(--navbar-height) + var(--content-gutter-top));
}
</style>

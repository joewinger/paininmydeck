<template>
  <div :class="{'questionCard': true, 'sticky': sticky }"
  @click="toggleSticky()"
  :style="{
    '--gradient-from': $store.getters['room/getCzarColorSet'][0],
    '--gradient-to': $store.getters['room/getCzarColorSet'][1]
  }">
    {{ text | blankify }}
  </div>
</template>

<script>
export default {
	name: 'QuestionCard',
	props: {
		text: String
	},
  data() {
    return {
      sticky: true
    };
  },
  methods: {
    toggleSticky() {
      this.sticky = !this.sticky;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.questionCard {
  display: flex;
  align-items: flex-end;
  
  width: 350px;
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
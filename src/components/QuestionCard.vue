<template>
  <div class="questionCard"
  :style="`background-image: linear-gradient(135deg, ${$store.getters['room/getCzarColorSet'][0]} 0%, ${$store.getters['room/getCzarColorSet'][1]} 100%)`">
    {{ this.text | blankify }}
  </div>
</template>

<script>
export default {
	name: 'QuestionCard',
	props: {
		text: String
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
	margin: 10px 0;
  
  border-radius: 15px;
  border: 4px solid #0E0E0E22;
  background-origin: border-box;
  /* box-shadow: 0px 2px 4px rgba(69, 134, 96, 0.52); */
  
  color: #fff;
  font-size: 30px;
	font-weight: 700;
	text-align: left;
}
</style>
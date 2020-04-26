<template>
  <div class="questionCard">
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
  
  width: 360px;
  min-height: 210px;
  padding: 50px 15px 15px 15px;
  
  border-radius: 15px;
  border: 3px solid #59A679;
  background: linear-gradient(112.52deg, #6FCF97 28.84%, #34B0A9 100.81%);
  box-shadow: 0px 2px 4px rgba(69, 134, 96, 0.52);
  
  color: #fff;
  font-size: 32px;
	font-weight: 700;
	text-align: left;
}
</style>
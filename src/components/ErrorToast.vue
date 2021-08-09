<template>
	<transition appear name="toast">
		<div id="errorToast" @click="close" v-if="$store.state.error.message">
			<span class="title">{{ $store.state.error.title }}</span>
      <span class="errorMessage">
        {{ $store.state.error.message }}
      </span>
      <div class="close">&times;</div>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'ErrorToast',
  methods: {
    close() {
      this.$store.dispatch('error', {});
    }
  }
}
</script>

<style scoped>
#errorToast {
  --height: 80px;
  --width: 85vmin;

  position: fixed;
  bottom: 10px;
  left: calc(50% - calc(var(--width) / 2));
  display: flex;
  flex-direction: column;
  gap: 5px;

  width: var(--width);
  /* height: var(--height); */
  box-sizing: border-box;
  padding: 10px;

  background-color: var(--error-100);
  border: var(--ui-border-width) solid var(--error-200);
  color: var(--error-500);
  border-radius: 7px;

  cursor: pointer;
  transition: transform 0.3s, opacity 0.3s;
  z-index: 2900;
}

#errorToast .title {
  font-weight: bold;
}

#errorToast p {
  padding: 0;
}

#errorToast .close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 10px;
  height: 10px;
  font-size: 1.2rem;
}

/* Over-scale and over-slide */
.toast-enter-to, .toast-leave {
  transform: scale(1.05) translateY(-5px);
}

.toast-enter {
  transform: scale(0.9) translateY( calc( var(--height) * 1.1 ) );
  opacity: 0;
}
/* Also skew when we're leaving, gives more of a 'falling' effect */
.toast-leave-to {
  transform: scale(0.9) skewY(10deg) translateY( calc( var(--height) * 1.1 ) );
  opacity: 0;
}
</style>
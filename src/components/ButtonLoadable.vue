<template>
	<button @click="onClick()" :class="{ 'loading': isLoading }" :disabled="isLoading">
    <slot></slot>
  </button>
</template>

<script>
export default {
	name: 'ButtonLoadable',
  data() {
    return {
      isLoading: false
    }
  },
  methods: {
    onClick: function() {
      this.isLoading = true;
      this.$emit('click', this.callback)
    },
    callback: function() {
      this.isLoading = false;
    }
  }
}
</script>

<style>
button.loading {
  position: relative;
  --spinner-size: 12px;
  font-style: italic;
  overflow: visible;
}
button.loading::before {
  content: "";

  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;

  width: 100%;
  height: 100%;

  background-color: inherit;
  border-radius: inherit;
}
button.loading::after {
  content: "";

  position: absolute;
  top: calc(50% - ( var(--spinner-size) / 2 ));
  left: calc(50% - ( var(--spinner-size) / 2 ));

  width: var(--spinner-size);
  height: var(--spinner-size);

  border-radius: 50%;
  border: solid 2px #FFF;
  border-bottom-color: transparent;

  --duration: 1s;
  animation: spin var(--duration) linear infinite;
  transition: all 0.2s ease-in-out;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes duration-change {
  from {
    --duration: 1s;
  }
  to {
    --duration: 5s;
  }
}

.loading-icon {
  text-align: center;
	display: flex;
	gap: 5px;
}

.loading-icon > div {
  width: 12px;
  height: 12px;
  background-color: #fff;

  border-radius: 100%;
  display: inline-block;
  -webkit-animation: sk-bouncedelay 1.4s infinite ease-in-out both;
  animation: sk-bouncedelay 1.4s infinite ease-in-out both;
}

.loading-icon .bounce1 {
  -webkit-animation-delay: -0.32s;
  animation-delay: -0.32s;
}

.loading-icon .bounce2 {
  -webkit-animation-delay: -0.16s;
  animation-delay: -0.16s;
}

@-webkit-keyframes sk-bouncedelay {
  0%, 80%, 100% { -webkit-transform: scale(0) }
  40% { -webkit-transform: scale(1.0) }
}

@keyframes sk-bouncedelay {
  0%, 80%, 100% { 
    -webkit-transform: scale(0);
    transform: scale(0);
  } 40% { 
    -webkit-transform: scale(1.0);
    transform: scale(1.0);
  }
}
</style>
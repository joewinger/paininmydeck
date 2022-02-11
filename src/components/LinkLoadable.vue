<template>
	<a @click="onClick()" :class="{ 'loading': isLoading }" :disabled="isLoading">
    <slot></slot>
  </a>
</template>

<script>
export default {
	name: 'LinkLoadable',
  data() {
    return {
      isLoading: false
    }
  },
  methods: {
    onClick: function() {
      if (this.isLoading) return;
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
a.loading {
  position: relative;
  --spinner-size: 12px;
  font-style: italic;
  overflow: visible;
  border-color: transparent;
}
a.loading::before {
  content: "";

  position: absolute;
  top: -5%;
  left: -5%;

  width: 110%;
  height: 110%;

  background-color: #F6F6F8;
}
a.loading::after {
  content: "";

  position: absolute;
  top: calc(50% - ( var(--spinner-size) / 2 ));
  left: calc(50% - ( var(--spinner-size) / 2 ));

  width: var(--spinner-size);
  height: var(--spinner-size);

  border-radius: 50%;
  border: solid 2px #828282;
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
</style>
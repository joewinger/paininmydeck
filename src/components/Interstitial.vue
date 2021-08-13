<template>
	<transition appear name="interstitial">
		<div id="interstitial" v-if="$store.state.interstitial.title">
      <h1>{{ $store.state.interstitial.title }}</h1>
      <h2>{{ $store.state.interstitial.subtitle }}</h2>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'Interstitial'
}
</script>

<style>
#interstitial {
  --duration: 4s;
  position: fixed;
  left: 150vw;
  display: none; /* set this to flex while the enter animation is active. */
  flex-direction: column;
  align-items: center;
  justify-content: center;

  width: 100vw;
  height: 100vh;

  text-align: center;

  cursor: default;
	-webkit-user-select: none;
     -moz-user-select: none;
			-ms-user-select: none;
					user-select: none;
  will-change: transform;
  transition: transform var(--duration) cubic-bezier(.15,.85,.85,.15);
  z-index: 2800;
}
#interstitial::after {
  --width: 70%;
  --offset: 20px;
  content: "";
  position: absolute;
  top: -50%;
  left: calc((100% - var(--width)) / 2 + var(--offset));
  
  width: var(--width);
  height: 200%;

  will-change: transform;
  opacity: 0.7;
  transition: transform var(--duration) linear;
  background-color: var(--gray-400);
  /* -1 because we're in a new stacking context based on #interstitial */
  z-index: -1;
}
#interstitial::before {
  --width: 80%;
  --offset: -10px;
  content: "";
  position: absolute;
  top: -50%;
  left: calc((100% - var(--width)) / 2 + var(--offset));
  
  width: var(--width);
  height: 200%;

  will-change: transform;
  opacity: 0.7;
  transition: transform var(--duration) linear;
  background-color: var(--gray-400);
  z-index: -2;
}

#interstitial h1, #interstitial h2 {
  color: var(--primary-100);
}
#interstitial h2 {
  max-width: 60vw;
  font-weight: 500;
}

/* Default position is left: 150vw. -150vw centers us, -250vw hides us, -300vw gives us a 50vw buffer. */
.interstitial-enter {
  transform: translateX(-300vw);
}
.interstitial-enter-active {
  display: flex !important;
}

/* The translates help this element move through the animation a bit
   faster, because it has farther to travel. Helps make things look nice. */
#interstitial.interstitial-enter::after {
  transform: rotate(10deg) translateX(-20vw);
}
#interstitial.interstitial-enter-to::after {
  transform: rotate(10deg) translateX(20vw);
}

#interstitial.interstitial-enter::before {
  transform: rotate(20deg);
}
#interstitial.interstitial-enter-to::before {
  transform: rotate(-5deg);
}
</style>
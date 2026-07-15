<template>
  <div class="carousel">
    <div class="btn-left" @click="moveCarousel(-1)"><ion-icon name="arrow-back" /></div>
    <div class="btn-right" @click="moveCarousel(1)"><ion-icon name="arrow-forward" /></div>
    <div class="scroll-port">
      <landing-carousel-slide
        v-for="(slide, index) in slidesArray"
        :key=index
        :slide-data=slide
				:active="(slideIndex==index)"
      />
    </div>
  </div>
</template>

<script>
import LandingCarouselSlide from "./LandingCarouselSlide";

export default {
  name: 'LandingCarousel',
  props: ['slidesArray'],
  components: {
    LandingCarouselSlide,
  },
	data() {
		return {
			mounted: false,
			slideIndex: 0,
			mouseHovering: false
		}
	},
  methods: {
    moveCarousel(change) {
			if (!this.mounted) return;
			const scrollPort = this.$el.querySelector('.scroll-port');

			const slideStyle = getComputedStyle(this.$el.querySelector('.carousel-slide'));
			const slideWidth = this.$el.querySelector('.carousel-slide').offsetWidth + (parseInt(slideStyle.marginLeft) + parseInt(slideStyle.marginRight));

			if (change < 0 && scrollPort.scrollLeft < slideWidth) {
				scrollPort.scrollTo(scrollPort.scrollWidth, 0);
				return;
			}
			if (change > 0 && (scrollPort.scrollWidth - scrollPort.scrollLeft - scrollPort.offsetWidth) < slideWidth) {
				scrollPort.scrollTo(0, 0);
				return;
			}

			scrollPort.scrollTo(scrollPort.scrollLeft + slideWidth * change, 0);
    },
		autoMoveCarousel(delay) {
			setTimeout(() => {
				// Don't progress carousel if mouse is on a slide.
				if (!this.mouseHovering) this.moveCarousel(1);
				
				this.autoMoveCarousel(delay);
			}, delay);
		}
  },
	mounted() {
		this.mounted = true;
		this.moveCarousel(1);

		const scrollPort = this.$el.querySelector('.scroll-port');
		const scrollPortStyle = getComputedStyle(scrollPort);

		const slide = this.$el.querySelector('.carousel-slide');
		const slideStyle = getComputedStyle(slide);
		const slideWidth = slide.clientWidth + parseInt(slideStyle.marginLeft) + parseInt(slideStyle.marginRight);

		scrollPort.addEventListener('scroll', () => {
			this.slideIndex = Math.round((scrollPort.scrollLeft - parseInt(scrollPortStyle.paddingLeft) - parseInt(slideStyle.marginLeft)) / slideWidth);
			if (this.slideIndex < 0) this.slideIndex = 0;
			if (this.slideIndex > this.slidesArray.length-1) this.slideIndex = this.slidesArray.length-1;
		});

		this.$el.onmouseover = () => this.mouseHovering = true;
		this.$el.onmouseout = () => this.mouseHovering = false;

		this.autoMoveCarousel(5000);
	}
};
</script>

<style lang="scss" scoped>
.carousel {
  position: relative;
  margin: 0 0 100px 0;

  .btn-left, .btn-right {
		display: flex;
		justify-content: center;
		align-items: center;
    position: absolute;
    top: calc(50% - 20px);

    width: 40px;
    height: 40px;

    border-radius: 100%;
		background: #FFF;
		box-shadow: 0px 0px 15px -5px rgba(177, 177, 177, 0.5), 0px 4px 4px rgba(177, 177, 177, 0.25);
		cursor: pointer;
		
		font: 24px "Inter";
	
    z-index: 50;
  }
  .btn-left {
    left: calc(
      (100% - min(600px, 90vw)) / 2 - 90px
    ); // 90px = button width + gutter size
  }
  .btn-right {
    right: calc((100% - min(600px, 90vw)) / 2 - 90px);
  }

  .scroll-port {
    display: flex;
    flex-direction: row;

    width: 100vw;
    padding: 30px 50vw;
    overflow-x: scroll;
    box-sizing: border-box;

    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;

		/* Hide scroll bar */
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    &::-webkit-scrollbar {
      display: none;
    }
  }

	@media screen and (max-width: 800px) {
		.carousel{
			margin: 0;

			.btn-left, .btn-right {
				display: none;
			}

			.scroll-port {
				flex-direction: column;
				padding: 30px 5vw;
			}
		}
	}
}
</style>
import { SwiperOptions } from 'swiper/types';
import { FreeMode, Navigation, Pagination } from 'swiper/modules';

export const UI_SWIPER_BASE_CONFIG: SwiperOptions = {  
  modules: [Navigation, Pagination, FreeMode],
  direction: 'horizontal',
  spaceBetween: 12,
  centeredSlides: false,
  /*
  * On screens smaller than tablet,
  * slide width is determined by .ui-swiper-slide max-width in CSS
  */
  // As of Swiper 11.1.4, there's a navigation bug that causes the slider to move by 2 slides
  // when the navigation button is enabled and clicked. The workaround to this is to manually
  // use the slideNext() and slidePrev() methods to navigate the slides with arrows instead
  // of enabling the navigation parameter.
  slidesPerView: 'auto',
  slidesPerGroup: 1,
  roundLengths: true,
  allowTouchMove: true,
  keyboard: {
    enabled: true,
  },
  breakpoints: {
    1400: {
      height: 400,
      slidesPerView: 3,
      slidesPerGroup: 1,
      spaceBetween: 16,
    },
    1200: {
      height: 390,
      slidesPerView: 3,
      slidesPerGroup: 1,
      spaceBetween: 16,
    },
    1024: {
      height: 390,
      slidesPerView: 2.75,
      slidesPerGroup: 2,
      spaceBetween: 16,
    },
    992: {
      height: 390,
      slidesPerView: 2.5,
      slidesPerGroup: 2,
      spaceBetween: 16,
    },
    768: {
      height: 390,
      slidesPerView: 2.25,
      slidesPerGroup: 2,
      spaceBetween: 16,
    },
    576: {
      height: 390,
      slidesPerView: 1.75,
      slidesPerGroup: 1,
      spaceBetween: 16,
    }, 
    450: {
      height: 390,
      slidesPerView: 1.5,
      slidesPerGroup: 1,
      spaceBetween: 16,
    }, 
  }
}
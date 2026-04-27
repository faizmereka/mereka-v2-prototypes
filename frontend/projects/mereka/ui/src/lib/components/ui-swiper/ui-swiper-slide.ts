/* eslint-disable @angular-eslint/component-class-suffix, @angular-eslint/component-selector */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
/*
 * NOTE:
 * ui-swiper is a wrapper around the Swiper library to provide the following:
 * - Directly uses Swiper custom element as the selector and avoid the need to add
 *  "schemas: [CUSTOM_ELEMENTS_SCHEMA]" to components that uses Swiper
 * - Allows setting the Swiper options via an "config" input
 * 
 * IMPORTANT:
 * - The swiper-container parent element must be a block and not flex display.
 *   Not doing so will cause the Swiper to behave unpredictably.
 */
import {   
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation
} from '@angular/core';

import { register } from 'swiper/element/bundle';
register();


@Component({
  selector: 'swiper-slide[ui-swiper-slide]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-swiper-slide.scss',
  host: {
    'class': 'ui-swiper-slide',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UISwiperSlide {
}
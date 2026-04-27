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
 * - The swiper-container parent element must be a block and not flex display element.
 *   Not doing so will cause the Swiper to behave and display unpredictably.
 * 
 * KNOWN ISSUES:
 * - As of 11.1.9, Swiper default navigation buttons are bugged, causing it to navigate multiple slides when clicked even if slidesPerGroup is 1.
 *   The workaround is to use custom prevEl and nextEl inputs below to toggle the slideNext() and slidePrev() methods to navigate the slides
 */
import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { SwiperContainer } from 'swiper/element';
import { Swiper, SwiperOptions } from 'swiper/types';
import { register } from 'swiper/element/bundle';
import { UISwiperNavigation } from './ui-swiper-navigation';

register();

@Component({
  selector: 'swiper-container[ui-swiper]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-swiper.scss',
  host: {
    'class': 'ui-swiper',
    '[class.ui-swiper-overflow]': 'overflow()',
    init: 'false',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UISwiper implements OnInit, AfterViewInit, OnDestroy {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly elementRef = inject<ElementRef<SwiperContainer>>(ElementRef);

  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private baseOptions: SwiperOptions = {};
  private swiper!: Swiper;
  swiperContainer!: SwiperContainer;

  readonly config = input<SwiperOptions>();
  readonly overflow = input<boolean>(true);
  readonly prevEl = input<UISwiperNavigation>();
  readonly nextEl = input<UISwiperNavigation>();

  private buttonEvents: (() => void)[] = [];

  constructor() {
    if (this.isBrowser) {
      this.swiperContainer = this.elementRef.nativeElement;
    }
  }

  ngOnInit(): void {
    if (!this.isBrowser) { return; }
    
    this.injectStyles();
    this.initSwiper();
  }

  injectStyles() {
    const injectStyles: string[] = [];

    if (this.overflow()) {
      injectStyles.push(`
        :host .swiper { 
        --swiper-navigation-sides-offset: calc(0px - 24px);
        --swiper-pagination-bullet-width: 8px;
        --swiper-pagination-bullet-height: 8px;
        --swiper-pagination-bottom: 0;
          overflow: visible;
        }
      `);
    } else {
      injectStyles.push(`
        :host .swiper { 
          --swiper-navigation-sides-offset: calc(0px - 24px);
          --swiper-pagination-bullet-width: 8px;
          --swiper-pagination-bullet-height: 8px;
          --swiper-pagination-bottom: 0;
        }
      `);
    }   

    injectStyles.push(`
      :host .swiper-pagination {
        margin-top: 1.5rem;
        position: relative;
      }

      :host .swiper-button-next,
      :host .swiper-button-prev {
        width: 3rem;
        height: 3rem;
        background-color: #FFF;
        border: 1px solid #DDDDDE;
        border-radius: 50%;
        color: #7B7B7B;
        box-shadow: 0px 2px 16px 0px rgba(85, 85, 85, 0.14);
      }
        
      :host .swiper-button-next > svg,
      :host .swiper-button-prev > svg {
        width: 14px;
        height: 14px;
      }

      :host .swiper-button-next > svg > path,
      :host .swiper-button-prev > svg > path {
        stroke: currentColor;
        stroke-width: 2px;
        stroke-linejoin: round;
      }
    `);
    

    let styles: object = {}; 
    styles = {
      injectStyles
    }
    
    this.baseOptions = {
      ...styles
    }
  }

  initSwiper() {
    if (this.swiperContainer) {
      const config: SwiperOptions = {
        ...this.baseOptions,
        ...this.config(),
      };
      Object.assign(this.swiperContainer, config);
      this.swiperContainer.initialize();
      this.swiper = this.swiperContainer.swiper;

      const prev = this.prevEl();
      const next = this.nextEl();

      if (this.swiper) {
        if (prev) {
          const buttonPrev = this.renderer.listen(
            prev.nativeElement,
            'click',
            () => {
              this.swiper.slidePrev();
            }
          );

          this.buttonEvents.push(buttonPrev);
        }

        if (next) {
          const buttonNext = this.renderer.listen(
            next.nativeElement,
            'click',
            () => {
              this.swiper.slideNext();
            }
          );

          this.buttonEvents.push(buttonNext);
        }
        
        this.swiper.on('slideChange', this.updateSwiperNavigation.bind(this));
      }
      
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateSwiperNavigation();
    }, 0);
  }

  updateSwiperNavigation() {
    if (this.swiper) {
      const prev = this.prevEl();
      const next = this.nextEl();
      if (prev) {
        prev.disabled = false;
        if (this.swiper.isBeginning) {
          prev.disabled = true;
        }
      }
      if (next) {
        next.disabled = false;
        if (this.swiper.isEnd) {
          next.disabled = true;
        }
      }
    }
  }
  
  ngOnDestroy() {
    // Clean up the listener when the component is destroyed
    if (this.buttonEvents.length) {
      this.buttonEvents.forEach(
        unlisten => unlisten()
      );
    }
    if (this.swiper) {
      this.swiper.off('slideChange', this.updateSwiperNavigation.bind(this));   
    }
  }
}
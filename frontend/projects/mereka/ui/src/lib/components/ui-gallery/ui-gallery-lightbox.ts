/* eslint-disable @angular-eslint/component-class-suffix */
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  ViewEncapsulation,
  inject,
  viewChild,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { UIButton, UIButtonIconDirective } from '@mereka/ui/ui-button/ui-button';
import { UIImage } from '@mereka/ui/ui-image/ui-image';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { Navigation, Pagination, FreeMode } from 'swiper/modules';
import { register } from 'swiper/element';
import { SwiperOptions } from 'swiper/types';
import { NgxMasonryComponent, NgxMasonryModule, NgxMasonryOptions } from 'ngx-masonry';
import { isPlatformBrowser } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';

register();

export enum UIGalleryLightboxViewMode {
  GRID = 'grid',
  SLIDER = 'slider',
  BOTH = 'both',
}
export enum UIGalleryLightboxActiveView {
  GRID = 'grid',
  SLIDER = 'slider',
}
export type UIGalleryLightboxData = {
  images: string[];
  selectedIndex?: number;
  viewMode?: UIGalleryLightboxViewMode;
}

@Component({
  exportAs: 'uiGalleryLightbox',
  selector: 'ui-gallery-lightbox',
  templateUrl: './ui-gallery-lightbox.html',
  styleUrl: './ui-gallery-lightbox.scss',
  host: {
    'class': 'ui-gallery-lightbox',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgxMasonryModule,
    UIButton,
    UIButtonIconDirective,
    UIImage,
    UISwiper,
    UISwiperSlide,
    MatIcon,
  ],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition(':enter', animate('750ms ease')),
      transition(':leave', animate('750ms ease')),
    ]),
  ],
})
export class UIGalleryLightbox implements OnInit {

  protected readonly data = inject<UIGalleryLightboxData | string[]>(MAT_DIALOG_DATA);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly dialogRef = inject(MatDialogRef<UIGalleryLightbox>);

  readonly masonryRef = viewChild<NgxMasonryComponent>('masonry');

  UIGalleryViewMode = UIGalleryLightboxViewMode;
  UIGalleryActiveView = UIGalleryLightboxActiveView;
  config: SwiperOptions = {
    modules: [Navigation, Pagination, FreeMode],
    direction: 'horizontal',
    slidesPerView: 1,
    slidesPerGroupAuto: true,
    spaceBetween: 20,
    centeredSlides: true,
    allowTouchMove: true,
    roundLengths: true,
    autoHeight: false,
    initialSlide: 0,
    loop: false,
    // As of Swiper 11.1.4, there's a navigation bug that causes the slider to move by 2 slides
    // when the navigation button is enabled and clicked. The workaround to this is to manually
    // use the slideNext() and slidePrev() methods to navigate the slides with arrows instead
    // of enabling the navigation parameter.
    // navigation: {
    //   nextEl: '.swiper-button-next',
    //   prevEl: '.swiper-button-prev',
    // },
    pagination: {
      el: '.ui-gallery-lightbox-pagination',
      type: 'fraction',
    },
    keyboard: {
      enabled: true,
    },
  };
  options: NgxMasonryOptions = {
    itemSelector: '.ui-gallery-masonry-item',
    columnWidth: '.ui-gallery-masonry-column',
    gutter: '.ui-gallery-masonry-gap',
    percentPosition: true,
  };

  isBrowser = isPlatformBrowser(this.platformId);

  selectedIndex = 0;
  viewMode: UIGalleryLightboxViewMode = UIGalleryLightboxViewMode.BOTH;
  activeView: UIGalleryLightboxActiveView = UIGalleryLightboxActiveView.GRID;
  images: string[] = [];

  ngOnInit() {
    if (Array.isArray(this.data)) {
      // Backward compatibility with images array data value
      this.images = this.data;
    } else if (typeof this.data === 'object' && this.data !== null) {    
      this.images = this.data.images ? this.data.images : [];
      this.viewMode = this.data.viewMode ? this.data.viewMode : UIGalleryLightboxViewMode.BOTH;
      this.selectedIndex = this.data.selectedIndex ? this.data.selectedIndex : 0;
    }

    this.config.initialSlide = this.selectedIndex || 0;

    if (this.viewMode === UIGalleryLightboxViewMode.BOTH) {
      // set the initial activeView to Grid when Both views are enabled
      this.activeView = UIGalleryLightboxActiveView.GRID;
    } else if (this.viewMode === UIGalleryLightboxViewMode.GRID) {
      // set the initial activeView to Grid when only Grid view is enabled
      this.activeView = UIGalleryLightboxActiveView.GRID;
    } else if (this.viewMode === UIGalleryLightboxViewMode.SLIDER) {
      // set the initial activeView to Slider when only Slider view is enabled
      this.activeView = UIGalleryLightboxActiveView.SLIDER;
    }
  }

  /** 
   * Move to the slide when the image in grid is selected
   */
  selectGridImage(index: number) {
    this.selectedIndex = index;
    this.config.initialSlide = index;
    this.activeView = UIGalleryLightboxActiveView.SLIDER;
  }
  /**
   * Back action
   */
  back() {
    if (this.viewMode === UIGalleryLightboxViewMode.BOTH) {
      if (this.activeView === UIGalleryLightboxActiveView.SLIDER) {
        // When activeView is Slider, we want to go back to Grid view and then exit gallery
        this.activeView = UIGalleryLightboxActiveView.GRID;
      } else {
        this.dialogRef.close();
      }
    } else {
      // When viewMode is either Grid or Slider, we want to exit gallery right away
      this.dialogRef.close();
    }
  }
}
/* eslint-disable @angular-eslint/component-class-suffix */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UIGalleryLightbox, UIGalleryLightboxData } from './ui-gallery-lightbox';
import { UIImage } from '@mereka/ui/ui-image/ui-image';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { UISwiperPagination } from '@mereka/ui/ui-swiper/ui-swiper-pagination';
import { Navigation, Pagination } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'ui-gallery, [ui-gallery]',
  templateUrl: './ui-gallery.html',
  styleUrl: './ui-gallery.scss',
  host: {
    'class': 'ui-gallery',
    '[class.ui-gallery-slider]': 'enableSlider()',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UIImage,
    UISwiper,
    UISwiperSlide,
    UISwiperPagination,
    MatIcon,
  ],
})
export class UIGallery {

  private readonly _dialog = inject(MatDialog);
  private readonly _changeDetectorRef = inject(ChangeDetectorRef);

  readonly images = input.required<string[]>();
  readonly altTitle = input<string>('');
  readonly enableSlider = input<boolean>(false);

  loading = false;
  pristine = true;
  config: SwiperOptions = {
    modules: [Navigation, Pagination],
    direction: 'horizontal',
    slidesPerView: 1,
    spaceBetween: 0,
    centeredSlides: true,
    allowTouchMove: true,
    roundLengths: true,
    autoHeight: false,
    navigation: {
      nextEl: '.button-next',
      prevEl: '.button-prev',
    },
    pagination: {
      el: '.ui-swiper-pagination',
      type: 'bullets',
      clickable: true,
      dynamicBullets: true,
      dynamicMainBullets: 5,
    },
    keyboard: {
      enabled: true,
    },
  };
  private _selectedIndex = 0;
  private _thumbsLoaded: boolean[] = [false, false, false, false];

  selectImageIndex(index: number) {
    if (this._selectedIndex != index) {      
      this.loading = true;
      this._selectedIndex = index;
      this._changeDetectorRef.markForCheck();
    }    
  }

  getImageIndex(): number {
    return this._selectedIndex;
  }

  getPreviewImage(): string {
    return this.images()[this._selectedIndex];
  }

  isThumbLoaded(index: number): boolean {
    return this._thumbsLoaded[index];
  }

  thumbLoaded(index: number) {
    this._thumbsLoaded[index] = true;
  }

  previewLoaded() {
    this.loading = false;
    this.pristine = false;
  }

  previewLoading() {
    return this.loading;
  }

  openGalleryLightbox(images = this.images()) {
    const filteredImages = images.filter(image => image !== '');

    const data: UIGalleryLightboxData = {
      images: filteredImages,
    }
    const dialog = this._dialog
      .open(UIGalleryLightbox, {
        width: '',
        height: '',
        maxWidth: '',
        maxHeight: '',
        backdropClass: ['ui-lightbox-overlay-backdrop'],
        panelClass: ['ui-lightbox-overlay-pane'],
        data: data
      })
      dialog.removePanelClass('mat-mdc-dialog-panel');
  }
}
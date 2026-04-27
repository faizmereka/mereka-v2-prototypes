/* eslint-disable @angular-eslint/component-class-suffix, @angular-eslint/component-selector, @typescript-eslint/no-explicit-any */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  inject,
  input,
  signal,
} from '@angular/core';

export type UIImagePlaceholder = 'default' | 'user';

@Component({
  selector: 'img[ui-image]',
  template: '',
  styleUrl: './ui-image.scss',
  host: {
    'class': 'ui-image',
    '[class.ui-image-loader]': 'loadingAnimation() && !loaded()',
    '(load)': 'onLoad()',
    '(error)': 'onError($event)',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIImage {

  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly placeholder = input<UIImagePlaceholder>('default');
  readonly customPlaceholder = input<string>('');
  readonly loadingAnimation = input<boolean>(true);

  /** Tracks whether the image has loaded or failed (so we can remove loader class). */
  readonly loaded = signal(false);

  onLoad() {
    this.loaded.set(true);
  }

  /** Get default image if src is invalid */
  onError(event: Event) {
    if (this.isBrowser && event.target instanceof HTMLImageElement) {
      this.loaded.set(true);
      const imageElement = event.target as HTMLImageElement;
      this.renderer.setAttribute(imageElement, 'src', this._getPlaceholder());
      imageElement.onerror = null;
    }
  }

  /** Retrieve placeholder image based on placeholder = 'user' or default */
  private _getPlaceholder(): string {
    let image = '';

    if (this.customPlaceholder() !== '') {
      image = this.customPlaceholder();
    } else {
      switch (this.placeholder()) {
          case 'user':
          image = '/assets/images/default-user.png';
          break;
        default:
          image = '/assets/images/default.png';
      }
    }

    return image;
  }
}

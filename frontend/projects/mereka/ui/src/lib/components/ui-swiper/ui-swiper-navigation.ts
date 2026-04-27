/* eslint-disable @angular-eslint/component-class-suffix, @angular-eslint/component-selector, @typescript-eslint/no-explicit-any */
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
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'button[ui-swiper-navigation]',
  templateUrl: './ui-swiper-navigation.html',
  styleUrl: './ui-swiper-navigation.scss',
  imports: [MatIcon],
  host: {
    'class': 'ui-swiper-navigation',
    '[class.ui-swiper-navigation-prev]': 'direction() === "prev"',
    '[class.ui-swiper-navigation-next]': 'direction() === "next"',
    '[attr.aria-label]': 'direction() === "prev" ? "Previous" : "Next"',
    '[attr.aria-disabled]': '_disabled ? "true" : "false"',
    '[attr.disabled]': '_disabled ? "disabled" : null',
    '[attr.hidden]': 'hideOnDisabled() ? (_disabled ? true : null) : (_hidden ? true : null)',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UISwiperNavigation {

  private readonly el = inject(ElementRef);

  protected _disabled = false;
  protected _hidden = false;

  readonly direction = input<'prev' | 'next'>('next');
  readonly hideOnDisabled = input<boolean>(true);

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: unknown) {
    this._disabled = coerceBooleanProperty(value);
  }

  get hidden(): boolean {
    return this._hidden;
  }
  set hidden(value: unknown) {
    this._hidden = coerceBooleanProperty(value);
  }

  get nativeElement() {
    return this.el.nativeElement;
  }
}

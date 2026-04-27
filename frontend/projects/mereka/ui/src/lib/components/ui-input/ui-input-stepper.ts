/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewEncapsulation,
  effect,
  forwardRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UIButton, UIButtonIconDirective } from '@mereka/ui/ui-button/ui-button';
import { MatIcon } from '@angular/material/icon';

export const STEPPER_CONTROL_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => UIInputStepper),
  multi: true,
};

@Component({
  selector: 'ui-input-stepper, [ui-input-stepper]',
  templateUrl: './ui-input-stepper.html',
  styleUrl: './ui-input-stepper.scss',
  providers: [STEPPER_CONTROL_VALUE_ACCESSOR],
  host: {
    'class': 'ui-input-stepper',
    '[attr.tabindex]': 'null',
    '[attr.aria-disabled]': 'disabled.toString()',
    '[class.ui-input-stepper-disabled]': 'disabled',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UIButton, UIButtonIconDirective, MatIcon],
})
export class UIInputStepper implements ControlValueAccessor, OnDestroy {

  private readonly _doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly _elementRef = inject(ElementRef);
  readonly _changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _focusMonitor = inject(FocusMonitor);

  readonly _increaseButton = viewChild<ElementRef<HTMLButtonElement>>('increaseButton');
  readonly _decreaseButton = viewChild<ElementRef<HTMLButtonElement>>('decreaseButton');

  protected touched = false;
  protected _onChange = (_value: number) => {};
  protected _onTouched = () => {};

  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private doc!: Document;

  readonly min = input<number>(0);
  readonly max = input<number>(Infinity);
  readonly step = input<number>(1);
  readonly readonly = input<boolean>(false);

  readonly _disabledInput = input<boolean>(false, { alias: 'disabled' });
  private _disabledFromCva = false;
  get disabled(): boolean {
    return this._disabledFromCva || coerceBooleanProperty(this._disabledInput());
  }

  readonly _showMaxLabel = input<boolean>(false, { alias: 'showMaxLabel' });
  get showMaxLabel(): boolean {
    return coerceBooleanProperty(this._showMaxLabel());
  }

  readonly valueChange = output<number>();

  readonly valueInput = input<number>(0, { alias: 'value' });

  value = 0;

  private _isCva = false;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private readonly _interval = 250;

  constructor() {
    effect(() => {
      if (!this._isCva) {
        this.value = this.valueInput();
      }
    });
    if (this.isBrowser) {
      this.doc = this._doc;
      this._focusMonitor.monitor(this._elementRef.nativeElement, true).subscribe(focusOrigin => {
        if (!focusOrigin) {
          setTimeout(() => {
            this.touched = false;
          }, 0);
        }
      });
    }
  }

  increase(): void {
    this.markAsTouched();
    const maxVal = this.max();
    const stepVal = this.step();
    let newValue: number;
    if (maxVal !== undefined && this.value < maxVal) {
      newValue = this.value + stepVal;
      if (newValue >= maxVal) {
        newValue = maxVal;
        this.endInterval();
      }
    } else {
      newValue = this.value + 1;
    }
    this._updateValue(newValue);
  }

  decrease(): void {
    this.markAsTouched();
    const minVal = this.min();
    const stepVal = this.step();
    let newValue: number;
    if (minVal !== undefined && this.value > minVal) {
      newValue = this.value - stepVal;
      if (newValue <= minVal) {
        newValue = minVal;
        this.endInterval();
      }
    } else {
      newValue = this.value - 1;
    }
    this._updateValue(newValue);
  }

  protected _updateValue(value: number) {
    this.value = value;
    this.valueChange.emit(value);
    this._onChange(value);
  }

  /**
   * Handles the mousedown and touchstart events on the increase button
   * =================================================================
   * NOTE: 
   * There are 2 conditions to check if the button is disabled
   * The first check prevents an iOS Webkit bug that fires a touch event on the button even though it is disabled.
   * The second check prevents setInterval from continuing after the button is disabled after hitting the maximum value.
   */
  onIncrease(e: Event): void {
    if (!this.isBrowser) return;
    if (e?.type === 'touchstart') {
      e.preventDefault();
    }
    const btn = this._increaseButton()?.nativeElement;
    if (!btn?.disabled) {
      this.increase();
      if (this._timer) return;
      this._timer = setInterval(() => {
        const b = this._increaseButton()?.nativeElement;
        if (!this.disabled && !b?.disabled) {
          this.increase();
        } else {
          this.endInterval();
        }
      }, this._interval);
    }
  }

  /**
   * Handles the mousedown and touchstart events on the decrease button
   * =================================================================
   * NOTE: 
   * There are 2 conditions to check if the button is disabled
   * The first check prevents an iOS Webkit bug that fires a touch event on the button even though it is disabled.
   * The second check prevents setInterval from continuing after the button is disabled after hitting the minimum value.
   */ 
  onDecrease(e: Event): void {
    if (!this.isBrowser) return;
    if (e?.type === 'touchstart') {
      e.preventDefault();
    }
    const btn = this._decreaseButton()?.nativeElement;
    if (!btn?.disabled) {
      this.decrease();
      if (this._timer) return;
      this._timer = setInterval(() => {
        const b = this._decreaseButton()?.nativeElement;
        if (!this.disabled && !b?.disabled) {
          this.decrease();
        } else {
          this.endInterval();
        }
      }, this._interval);
    }
  }

  /** Handles the mouseup and touchend events on the buttons */
  onRelease(): void {
    this.endInterval();
  }

  endInterval() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Implemented as part of ControlValueAccessor.
   */ 
  writeValue(value: number): void {
    const minVal = this.min();
    const maxVal = this.max();
    this.value = maxVal !== undefined
      ? Math.min(Math.max(value, minVal), maxVal)
      : Math.max(value, minVal);
  }

  /**
   * Implemented as part of ControlValueAccessor.
   */ 
  registerOnChange(fn: (value: number) => void) {
    this._isCva = true;
    this._onChange = fn;
  }
  
  /**
   * Implemented as part of ControlValueAccessor.
   */  
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /**
   * Implemented as part of ControlValueAccessor.
   */  
  setDisabledState(isDisabled: boolean) {
    this._disabledFromCva = isDisabled;
    this._changeDetectorRef.markForCheck();
    this.endInterval();
  }

  /** Mark the component as ng-touched */
  markAsTouched() {
    if (!this.touched) {
      this._onTouched();
      this.touched = true;
    }
  }

  /** Remove all listeners and intervals on destroy. */
  ngOnDestroy() {
    if (!this.isBrowser) { return; }
    this.endInterval();
    this.doc.removeEventListener('mouseup', this.onRelease);
    this.doc.removeEventListener('touchend', this.onRelease);
  }
}
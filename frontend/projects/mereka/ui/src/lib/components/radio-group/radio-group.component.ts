import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ui-radio-group',
  imports: [CommonModule],
  template: `<div class="space-y-3" role="radiogroup"><ng-content></ng-content></div>`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiRadioGroupComponent),
      multi: true,
    },
  ],
})
export class UiRadioGroupComponent<T> implements ControlValueAccessor {
  @Input() value: T | null = null;
  @Output() valueChange = new EventEmitter<T>();

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T): void {
    this.value = value;
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  select(value: T) {
    this.value = value;
    this.valueChange.emit(value);
    this.onChange(value);
    this.onTouched();
  }
}

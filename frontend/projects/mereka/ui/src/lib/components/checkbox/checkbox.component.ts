import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'ui-checkbox',
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <label [class]="containerClasses">
      <input
        type="checkbox"
        [id]="checkboxId"
        [disabled]="disabled"
        [(ngModel)]="checked"
        (ngModelChange)="onCheckboxChange($event)"
        class="sr-only peer"
      />

      <!-- Custom Checkbox -->
      <div [class]="checkboxClasses">
        <svg class="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Label -->
      @if (label) {
        <span class="text-sm text-gray-700 select-none">{{ label }}</span>
      }
      <ng-content></ng-content>
    </label>

    <!-- Error Message -->
    @if (error) {
      <p class="mt-1 text-sm text-red-600 ml-7">{{ error }}</p>
    }
  `,
})
export class UiCheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;
  @Input() error = '';
  @Input() checkboxId = `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  checked = false;
  onChange: (value: boolean) => void = () => {};
  onTouched: () => void = () => {};

  get containerClasses(): string {
    const cursor = this.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer';
    return `inline-flex items-center gap-3 ${cursor}`;
  }

  get checkboxClasses(): string {
    return `w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center transition-colors
            peer-checked:bg-primary peer-checked:border-primary
            peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2
            peer-disabled:bg-gray-100 peer-disabled:border-gray-200`;
  }

  writeValue(value: boolean): void {
    this.checked = value || false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onCheckboxChange(value: boolean): void {
    this.checked = value;
    this.onChange(value);
    this.onTouched();
  }
}

import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'ui-select',
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      <!-- Label -->
      @if (label) {
        <label [for]="selectId" class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ label }}
          @if (required) {
            <span class="text-red-500">*</span>
          }
        </label>
      }

      <!-- Select -->
      <div class="relative">
        <select
          [id]="selectId"
          [disabled]="disabled"
          [(ngModel)]="value"
          (ngModelChange)="onSelectChange($event)"
          (blur)="onTouched()"
          [class]="selectClasses"
        >
          @if (placeholder) {
            <option value="" disabled>{{ placeholder }}</option>
          }
          @for (option of options; track option.value) {
            <option [value]="option.value" [disabled]="option.disabled">
              {{ option.label }}
            </option>
          }
        </select>

        <!-- Dropdown Icon -->
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- Error Message -->
      @if (error) {
        <p class="mt-1.5 text-sm text-red-600">{{ error }}</p>
      }

      <!-- Helper Text -->
      @if (helper && !error) {
        <p class="mt-1.5 text-sm text-gray-500">{{ helper }}</p>
      }
    </div>
  `,
})
export class UiSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() options: SelectOption[] = [];
  @Input() error = '';
  @Input() helper = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() selectId = `select-${Math.random().toString(36).substr(2, 9)}`;

  @Output() valueChange = new EventEmitter<string | number>();

  value: string | number = '';
  onChange: (value: string | number) => void = () => {};
  onTouched: () => void = () => {};

  get selectClasses(): string {
    const base = 'block w-full rounded-lg border appearance-none transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 pr-10';
    const padding = 'px-4 py-3';
    const state = this.error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
      : 'border-gray-300 focus:border-primary focus:ring-primary bg-white';
    const disabled = this.disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'cursor-pointer';

    return `${base} ${padding} ${state} ${disabled} text-gray-900`;
  }

  writeValue(value: string | number): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSelectChange(value: string | number): void {
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }
}

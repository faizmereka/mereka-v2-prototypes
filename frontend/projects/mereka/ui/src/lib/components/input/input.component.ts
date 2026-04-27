import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'ui-input',
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      <!-- Label -->
      @if (label) {
        <label [for]="inputId" class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ label }}
          @if (required) {
            <span class="text-red-500">*</span>
          }
        </label>
      }

      <!-- Input Container -->
      <div class="relative">
        <!-- Icon Left -->
        @if (iconLeft) {
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ng-content select="[iconLeft]"></ng-content>
          </div>
        }

        <!-- Input -->
        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [attr.maxlength]="maxLength"
          [(ngModel)]="value"
          (ngModelChange)="onInputChange($event)"
          (blur)="onTouched()"
          [class]="inputClasses"
        />

        <!-- Icon Right -->
        @if (iconRight) {
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
            <ng-content select="[iconRight]"></ng-content>
          </div>
        }
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
export class UiInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' = 'text';
  @Input() error = '';
  @Input() helper = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() iconLeft = false;
  @Input() iconRight = false;
  @Input() inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  @Input() maxLength?: number;

  value = '';
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get inputClasses(): string {
    const base = 'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';
    const padding = this.iconLeft ? 'pl-10 pr-4 py-3' : this.iconRight ? 'pl-4 pr-10 py-3' : 'px-4 py-3';
    const state = this.error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
      : 'border-gray-300 focus:border-primary focus:ring-primary bg-white';
    const disabled = this.disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : '';

    return `${base} ${padding} ${state} ${disabled} text-gray-900 placeholder:text-gray-400`;
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }
}

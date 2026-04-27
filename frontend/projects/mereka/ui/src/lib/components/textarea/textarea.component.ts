import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'ui-textarea',
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiTextareaComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      <!-- Label -->
      @if (label) {
        <label [for]="textareaId" class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ label }}
          @if (required) {
            <span class="text-red-500">*</span>
          }
        </label>
      }

      <!-- Textarea -->
      <textarea
        [id]="textareaId"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [rows]="rows"
        [(ngModel)]="value"
        (ngModelChange)="onInputChange($event)"
        (blur)="onTouched()"
        [class]="textareaClasses"
      ></textarea>

      <!-- Character Count -->
      @if (showCount && maxLength) {
        <div class="mt-1.5 text-right text-sm text-gray-500">
          {{ value?.length || 0 }} / {{ maxLength }}
        </div>
      }

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
export class UiTextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 4;
  @Input() error = '';
  @Input() helper = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() maxLength?: number;
  @Input() showCount = false;
  @Input() textareaId = `textarea-${Math.random().toString(36).substr(2, 9)}`;

  value = '';
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get textareaClasses(): string {
    const base = 'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none';
    const padding = 'px-4 py-3';
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

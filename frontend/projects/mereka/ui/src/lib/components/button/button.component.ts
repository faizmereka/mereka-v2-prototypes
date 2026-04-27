import { Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-button',
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
    >
      <!-- Loading Spinner -->
      @if (loading) {
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }

      <!-- Icon Left -->
      @if (iconLeft && !loading) {
        <span class="mr-2">
          <ng-content select="[iconLeft]"></ng-content>
        </span>
      }

      <!-- Button Content -->
      <ng-content></ng-content>

      <!-- Icon Right -->
      @if (iconRight) {
        <span class="ml-2">
          <ng-content select="[iconRight]"></ng-content>
        </span>
      }
    </button>
  `,
})
export class UiButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) fullWidth = false;
  @Input({ transform: booleanAttribute }) iconLeft = false;
  @Input({ transform: booleanAttribute }) iconRight = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get buttonClasses(): string {
    const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary disabled:bg-primary/50',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300 disabled:bg-gray-50',
      outline: 'border-2 border-primary text-primary bg-transparent hover:bg-primary/5 focus:ring-primary disabled:opacity-50',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300 disabled:opacity-50',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
      link: 'text-primary underline hover:text-primary/80 focus:ring-primary disabled:opacity-50 p-0',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const width = this.fullWidth ? 'w-full' : '';
    const cursor = this.disabled || this.loading ? 'cursor-not-allowed' : 'cursor-pointer';

    return `${base} ${variants[this.variant]} ${sizes[this.size]} ${width} ${cursor}`;
  }
}

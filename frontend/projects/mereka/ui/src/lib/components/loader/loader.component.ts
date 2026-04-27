import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type LoaderSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-loader',
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses">
      <svg [class]="spinnerClasses" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      @if (text) {
        <span [class]="textClasses">{{ text }}</span>
      }
    </div>
  `,
})
export class UiLoaderComponent {
  @Input() size: LoaderSize = 'md';
  @Input() text = '';
  @Input() fullScreen = false;
  @Input() overlay = false;

  get containerClasses(): string {
    const base = 'flex flex-col items-center justify-center gap-3';
    const fullScreen = this.fullScreen ? 'fixed inset-0 z-50' : '';
    const overlay = this.overlay ? 'bg-black/50' : '';
    return `${base} ${fullScreen} ${overlay}`;
  }

  get spinnerClasses(): string {
    const sizes: Record<LoaderSize, string> = {
      sm: 'w-5 h-5',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };
    return `animate-spin text-primary ${sizes[this.size]}`;
  }

  get textClasses(): string {
    const sizes: Record<LoaderSize, string> = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };
    return `text-gray-600 ${sizes[this.size]}`;
  }
}

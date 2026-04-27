import { Component, input } from '@angular/core';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

@Component({
  selector: 'ui-badge',
  template: `
    <span
      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      [class]="variantClasses()"
    >
      <ng-content></ng-content>
    </span>
  `,
  styles: ``,
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');

  variantClasses() {
    const variants = {
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
      info: 'bg-info/10 text-info',
      default: 'bg-gray-100 text-gray-700',
    };
    return variants[this.variant()];
  }
}

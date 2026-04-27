import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-badge',
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      @if (dot) {
        <span [class]="dotClasses"></span>
      }
      <ng-content></ng-content>
    </span>
  `,
})
export class UiBadgeComponent {
  @Input() variant: BadgeVariant = 'default';
  @Input() size: BadgeSize = 'md';
  @Input() dot = false;
  @Input() rounded = false;

  get badgeClasses(): string {
    const base = 'inline-flex items-center font-medium';

    const variants: Record<BadgeVariant, string> = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-primary/10 text-primary',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
    };

    const sizes: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    const shape = this.rounded ? 'rounded-full' : 'rounded-md';
    const gap = this.dot ? 'gap-1.5' : '';

    return `${base} ${variants[this.variant]} ${sizes[this.size]} ${shape} ${gap}`;
  }

  get dotClasses(): string {
    const colors: Record<BadgeVariant, string> = {
      default: 'bg-gray-500',
      primary: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      info: 'bg-blue-500',
    };
    return `w-1.5 h-1.5 rounded-full ${colors[this.variant]}`;
  }
}

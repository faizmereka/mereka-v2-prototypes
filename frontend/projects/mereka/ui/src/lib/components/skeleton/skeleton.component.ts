import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'line' | 'circle' | 'rect';

/**
 * Generic skeleton loader component for showing loading placeholders
 *
 * Usage:
 * <ui-skeleton variant="line" />                    - Full width line
 * <ui-skeleton variant="line" width="w-32" />       - Fixed width line
 * <ui-skeleton variant="circle" width="w-12" />    - Circle avatar
 * <ui-skeleton variant="rect" height="h-32" />     - Rectangle card
 */
@Component({
  selector: 'ui-skeleton',
  imports: [CommonModule],
  template: `
    <div
      [class]="skeletonClasses()"
      [style.animation-delay]="delay() + 'ms'"
    ></div>
  `,
  styles: [`
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `]
})
export class UiSkeletonComponent {
  readonly variant = input<SkeletonVariant>('line');
  readonly width = input<string>('');
  readonly height = input<string>('');
  readonly rounded = input<string>('');
  readonly delay = input<number>(0);
  readonly containerClass = input<string>('');

  skeletonClasses(): string {
    const v = this.variant();
    const w = this.width();
    const h = this.height();
    const r = this.rounded();
    const custom = this.containerClass();

    // Base classes
    const base = 'skeleton-shimmer';

    // Variant-specific defaults
    let variantClasses = '';
    switch (v) {
      case 'circle':
        variantClasses = `${w || 'w-10'} ${h || 'h-10'} rounded-full`;
        break;
      case 'rect':
        variantClasses = `${w || 'w-full'} ${h || 'h-24'} ${r || 'rounded-lg'}`;
        break;
      case 'line':
      default:
        variantClasses = `${w || 'w-full'} ${h || 'h-4'} ${r || 'rounded'}`;
        break;
    }

    return `${base} ${variantClasses} ${custom}`.trim();
  }
}

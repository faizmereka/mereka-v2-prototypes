import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSkeletonComponent } from './skeleton.component';

/**
 * Pre-built skeleton card for dashboard cards, stats, etc.
 *
 * Usage:
 * <ui-skeleton-card />
 * <ui-skeleton-card [showIcon]="true" [lines]="3" />
 */
@Component({
  selector: 'ui-skeleton-card',
  imports: [CommonModule, UiSkeletonComponent],
  template: `
    <div [class]="'bg-white rounded-xl border border-neutral-200 p-5 ' + containerClass()">
      <div class="flex items-start gap-4">
        @if (showIcon()) {
          <ui-skeleton variant="rect" width="w-14" height="h-14" rounded="rounded-xl" />
        }
        <div class="flex-1 space-y-3">
          <ui-skeleton variant="line" width="w-24" height="h-3" />
          <ui-skeleton variant="line" width="w-32" height="h-6" />
          @for (i of lineArray(); track i) {
            <ui-skeleton variant="line" [width]="i % 2 === 0 ? 'w-full' : 'w-3/4'" height="h-3" [delay]="i * 100" />
          }
        </div>
      </div>
    </div>
  `,
})
export class UiSkeletonCardComponent {
  readonly showIcon = input<boolean>(true);
  readonly lines = input<number>(1);
  readonly containerClass = input<string>('');

  lineArray(): number[] {
    return Array.from({ length: this.lines() }, (_, i) => i);
  }
}

/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { UILoaderSkeleton, UILoaderSkeletonGroup } from '@mereka/ui/ui-loader-skeleton/ui-loader-skeleton';

@Component({
  selector: 'ui-loader-skeleton-card, [ui-loader-skeleton-card]',
  imports: [UILoaderSkeleton],
  templateUrl: './ui-loader-skeleton-card.html',
  styleUrl: './ui-loader-skeleton-card.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-loader-skeleton-card',
    role: 'progressbar',
    tabindex: '-1',
  },
})
export class UILoaderSkeletonCard extends UILoaderSkeletonGroup {

  readonly layout = input<'experience' | 'expertise' | 'expert' | 'hub' | 'review'>();
}
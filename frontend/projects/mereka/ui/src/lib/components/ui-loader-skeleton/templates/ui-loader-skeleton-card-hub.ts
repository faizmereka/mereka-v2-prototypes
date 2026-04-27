/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { UILoaderSkeleton, UILoaderSkeletonGroup } from '@mereka/ui/ui-loader-skeleton/ui-loader-skeleton';

@Component({
  selector: 'ui-loader-skeleton-card-hub, [ui-loader-skeleton-card-hub]',
  exportAs: 'uiLoaderSkeletonCardHub',
  imports: [UILoaderSkeleton],
  templateUrl: './ui-loader-skeleton-card-hub.html',
  styleUrl: './ui-loader-skeleton-card-hub.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-loader-skeleton-card-hub',
  },
})
export class UILoaderSkeletonCardHub extends UILoaderSkeletonGroup {}
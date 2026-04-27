/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars  */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import { NumberInput, coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'ui-loader-skeleton, [ui-loader-skeleton]',
  imports: [],
  templateUrl: './ui-loader-skeleton.html',
  styleUrl: './ui-loader-skeleton.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-loader-skeleton',
    '[attr.data-appearance]': 'appearance()',
    '[attr.data-tint]': 'tint() === "dark" ? "dark" : null',
    '[style.width]': 'appearance() === "line" && width() ? width() + "%" : null',
  },
})
export class UILoaderSkeleton {

  readonly appearance = input.required<'circle' | 'line' | 'square' | 'square-rounded' | 'custom' | ''>();
  readonly tint = input<'dark' | 'light'>('light');
  readonly width = input<NumberInput>(0);
}

/*
 * NOTE:
 * The purpose of UILoaderSkeletonGroup is to add the role and tabindex attributes to the host element 
 * and to group multiple UILoaderSkeleton components.
 */

@Component({
  selector: 'ui-loader-skeleton-group, [ui-loader-skeleton-group]',
  imports: [],
  template: `<ng-content></ng-content>`,
  styles: [``],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'ui-loader-skeleton-group',
    '[attr.aria-label]': 'ariaLabel() || null',
    'aria-busy': 'true',
    role: 'progressbar',
    tabindex: '-1',
  },
})
export class UILoaderSkeletonGroup {

  readonly ariaLabel = input<string>('');
}
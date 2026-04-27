/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any, @angular-eslint/component-selector */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  inject,
  input,
  computed,
} from '@angular/core';

@Component({
  selector: 'ui-card, [ui-card]',
  template: '<div class="ui-card-content"><ng-content></ng-content></div>',
  styleUrl: './ui-card.scss',
  exportAs: 'uiCard',
  host: {
    class: 'ui-card',
    role: 'listitem',
    '[class]': 'hostClasses()',
    '[class.ui-card-dark]': 'theme() === "dark"',
    '[class.ui-card--active]': 'active()',
    '[class.ui-card--no-hover]': '!hoverEffect()',
  },
  encapsulation: ViewEncapsulation.None,
})
export class UICard {
  protected elementRef = inject(ElementRef);

  theme = input<'light' | 'dark'>('light');
  active = input<boolean>(false);
  hoverEffect = input<boolean>(true);
  target = input<string | null>(null);
  layout = input<string>('');

  hostClasses = computed(() => {
    const layout = this.layout();
    return layout ? ` ui-card--${layout}` : '';
  });

  get nativeElement() {
    return this.elementRef.nativeElement;
  }

  isEmpty(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    return false;
  }
}

@Component({
  exportAs: 'uiCardTitle',
  selector: 'ui-card-title, [ui-card-title]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-card.scss',
  host: {
    class: 'ui-card-title',
    '[class.ui-card-title--clamp-1]': 'lineClamp() === 1',
    '[class.ui-card-title--clamp-2]': 'lineClamp() === 2',
    '[class.ui-card-title--clamp-3]': 'lineClamp() === 3',
  },
  encapsulation: ViewEncapsulation.None,
})
export class UICardTitle {
  lineClamp = input<number>(0);
}

@Component({
  exportAs: 'uiCardImage',
  selector: 'ui-card-image, [ui-card-image]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-card.scss',
  host: {
    class: 'ui-card-image',
    '[style.padding-bottom.%]': 'paddingBottom()',
  },
  encapsulation: ViewEncapsulation.None,
})
export class UICardImage {
  aspectRatio = input<number>(1.7778);
  paddingBottom = computed(() => Math.round(100 / this.aspectRatio()));
}

@Component({
  exportAs: 'uiCardBody',
  selector: 'ui-card-body, [ui-card-body]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-card.scss',
  host: { class: 'ui-card-body' },
  encapsulation: ViewEncapsulation.None,
})
export class UICardBody {}

@Component({
  exportAs: 'uiCardLink',
  selector: 'a.ui-card-link, a[ui-card-link]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-card.scss',
  host: { class: 'ui-card-link' },
  encapsulation: ViewEncapsulation.None,
})
export class UICardLink {}

@Component({
  exportAs: 'uiCardRow',
  selector: 'ui-card-row, [ui-card-row]',
  template: '<ng-content></ng-content>',
  styleUrl: './ui-card.scss',
  host: { class: 'ui-card-row' },
  encapsulation: ViewEncapsulation.None,
})
export class UICardRow {}

export type UICardPriceLabelType = {
  beforeLabel?: string;
  afterLabel?: string;
  amount?: string;
};

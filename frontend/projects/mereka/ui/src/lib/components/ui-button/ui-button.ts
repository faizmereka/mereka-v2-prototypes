/* eslint-disable */
import { FocusMonitor, FocusableOption, FocusOrigin } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  Directive,
  ElementRef,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
  input,
  effect,
  NgZone,
} from '@angular/core';

const BUTTON_HOST_ATTRIBUTES = [
  'ui-button-fill',
  'ui-button-fill-large',
  'ui-button-outline',
  'ui-button-outline-large',
  'ui-button-ghost',
  'ui-button-ghost-inverse',
  'ui-button-underline',
  'ui-button-icon',
  'ui-button-icon-outline',
  'ui-button-ai',
  'ui-button-ai-large'
];

const _UIButtonBase = class {
  _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {}
};

@Component({
  selector: `
    button[ui-button],
    button[ui-button-fill],
    button[ui-button-fill-large],
    button[ui-button-outline],
    button[ui-button-outline-large],
    button[ui-button-ghost],
    button[ui-button-ghost-inverse],
    button[ui-button-underline],
    button[ui-button-icon],
    button[ui-button-icon-outline],
    button[ui-button-ai],
    button[ui-button-ai-large]
  `,
  exportAs: 'uiButton',
  templateUrl: 'ui-button.html',
  styleUrl: 'ui-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.disabled]': '_disabled() || null',
    '[class.ui-button-disabled]': '_disabled()',
    '[class.ui-button-selected]': '_selected()',
    'class': 'ui-button-focus-indicator',
  },
  encapsulation: ViewEncapsulation.None,
})
export class UIButton extends _UIButtonBase
  implements OnInit, AfterViewInit, OnDestroy, FocusableOption {

  private readonly _focusMonitor = inject(FocusMonitor);
  private readonly _renderer = inject(Renderer2);

  readonly type = input<string>('button');
  readonly _selected = input<boolean>(false, { alias: 'selected' });
  readonly _disabled = input<boolean>(false, { alias: 'disabled' });
  readonly disabledColor = input<string>('');

  /** @inheritdoc FocusableOption */
  get disabled(): boolean {
    return coerceBooleanProperty(this._disabled());
  }

  get selected(): boolean {
    return coerceBooleanProperty(this._selected());
  }

  constructor() {
    super();
    const el = this._elementRef.nativeElement;
    el.classList.add('ui-button');
    for (const attr of BUTTON_HOST_ATTRIBUTES) {
      if (this._hasHostAttributes(attr)) {
        (this._getHostElement() as HTMLElement).classList.add(attr);
      }
    }
    effect(() => {
      this._renderer.setAttribute(this._getHostElement(), 'type', this.type());
    });
    effect(() => {
      const hostEl = this._getHostElement() as HTMLElement;
      hostEl.classList.remove('ui-button-disabled-primary', 'ui-button-disabled-secondary');
      const color = this.disabledColor();
      if (color === 'primary' || color === 'secondary') {
        hostEl.classList.add('ui-button-disabled-' + color);
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    this._focusMonitor.monitor(this._elementRef, true);
  }

  ngOnDestroy() {
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  /** Focuses the button. */
  focus(origin?: FocusOrigin, options?: FocusOptions): void {
    if (origin) {
      this._focusMonitor.focusVia(this._getHostElement(), origin, options);
    } else {
      this._getHostElement().focus(options);
    }
  }

  _getHostElement() {
    return this._elementRef.nativeElement;
  }

  /** Gets whether the button has one of the given attributes. */
  _hasHostAttributes(...attributes: string[]) {
    return attributes.some((attribute) =>
      this._getHostElement().hasAttribute(attribute)
    );
  }
}

/**
 * Anchor button.
 */
@Component({
  selector: `
    a[ui-button],
    a[ui-button-fill],
    a[ui-button-fill-large],
    a[ui-button-outline],
    a[ui-button-outline-large],
    a[ui-button-ghost],
    a[ui-button-ghost-inverse],
    a[ui-button-underline],
    a[ui-button-icon],
    a[ui-button-icon-outline],
    a[ui-button-ai],
    a[ui-button-ai-large]
  `,
  exportAs: 'uiButton, uiAnchor',
  host: {
    '[attr.tabindex]': '_disabled() ? -1 : tabIndex()',
    '[attr.disabled]': '_disabled() || null',
    '[attr.aria-disabled]': '_disabled().toString()',
    '[class.ui-button-selected]': '_selected()',
    '[class.ui-button-disabled]': '_disabled()',
    'class': 'ui-focus-indicator',
  },
  templateUrl: 'ui-button.html',
  styleUrl: 'ui-button.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIAnchor extends UIButton implements AfterViewInit, OnDestroy {
  readonly tabIndex = input<number>(0);

  private readonly _ngZone = inject(NgZone, { optional: true });

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    const el = this._elementRef.nativeElement;
    if (this._ngZone) {
      this._ngZone.runOutsideAngular(() => {
        el.addEventListener('click', this._haltDisabledEvents);
      });
    } else {
      el.addEventListener('click', this._haltDisabledEvents);
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this._elementRef.nativeElement.removeEventListener('click', this._haltDisabledEvents);
  }

  _haltDisabledEvents = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
}

@Directive({
  selector: 'span[ui-button-label]',
  host: { 'class': 'ui-button-label-wrapper' },
})
export class UIButtonLabelDirective {}

@Directive({
  selector: 'span[ui-button-icon-wrapper], [ui-button-icon-wrapper]',
  host: { 'class': 'ui-button-icon-wrapper' },
})
export class UIButtonIconDirective {}

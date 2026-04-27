/* eslint-disable @angular-eslint/component-class-suffix */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  BooleanInput,
  coerceBooleanProperty,
} from '@angular/cdk/coercion';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';

/** Possible visibility states of a tooltip. */
export type UITooltipState = 'initial' | 'visible' | 'hidden';
/** Possible positions for a tooltip. */
export type UITooltipPosition = 'left' | 'right' | 'top' | 'bottom';
/** Possible horizontal text alignment in relative to the pointer */
export type UITooltipPointerAlign = 'start' | 'end' | '';

@Component({
  selector: 'ui-tooltip , [ui-tooltip]',
  imports: [],
  templateUrl: './ui-tooltip.component.html',
  styleUrl: './ui-tooltip.component.scss',
  inputs: ['visible', 'hidden'],
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'ui-tooltip',
    '[class.ui-panel-expanded]': 'expanded',
  },
  animations: [
    trigger('showHide', [
      state('visible', style({ opacity: 1, visibility: 'visible' })),
      state('hidden, void', style({ opacity: 0, visibility: 'hidden' })),
      transition('visible <=> hidden, void => hidden', animate('225ms cubic-bezier(0.4,0.0,0.2,1)')),
    ])
  ]
})
export class UITooltip implements AfterViewInit {
  elementRef: ElementRef | undefined;
  @Input() tooltipText: string = '';
  @Input() customStyle: any;
  /** Event emitted every time the Tooltip is visible. */
  @Output() readonly afterVisible: EventEmitter<void> =
    new EventEmitter<void>();
  /** Event emitted every time the Tooltip is opened. */
  @Output() readonly afterHidden: EventEmitter<void> =
    new EventEmitter<void>();

  @HostBinding('class') get class() {
    if (this._pAlign) {
      return 'ui-tooltip-' + this._position + ' align-' + this._pAlign;
    } else {
      return 'ui-tooltip-' + this._position;
    }
  }

  constructor(
    elementRef: ElementRef,
    private _changeDetectorRef: ChangeDetectorRef
  ) {}

  /** Gets the expanded state string. */
  _getVisibilityState(): UITooltipState {
    return this.visible ? 'visible' : 'hidden';
  }

  toggleTooltip(): void {
    this.visible = !this.visible;
  }

  @Input('tooltipPosition')
  get position(): UITooltipPosition {
    return this._position;
  }
  set position(value: UITooltipPosition) {
    if (value !== this._position) {
      this._position = value;

      /*if (this._overlayRef) {
        this._updatePosition(this._overlayRef);
        this._tooltipInstance?.show(0);
        this._overlayRef.updatePosition();
      }*/
    }
  }
  private _position: UITooltipPosition = 'top';

  @Input('tooltipPointerAlign')
  get pAlign(): UITooltipPointerAlign {
    return this._pAlign;
  }
  set pAlign(value: UITooltipPointerAlign) {
    if (value !== this._pAlign) {
      this._pAlign = value;

      /*if (this._overlayRef) {
        this._updatePosition(this._overlayRef);
        this._tooltipInstance?.show(0);
        this._overlayRef.updatePosition();
      }*/
    }
  }
  private _pAlign: UITooltipPointerAlign = '';

  @Input()
  get visible(): boolean {
    return this._visible;
  }
  set visible(visible: BooleanInput) {
    visible = coerceBooleanProperty(visible);

    // Only emit events and update the internal value if the value changes.
    if (this._visible !== visible) {
      this._visible = visible;
      /*this.visibleChange.emit(visible);

      if (visible) {
        this.opened.emit();
      } else {
        this.closed.emit();
      }*/

      // Ensures that the animation will run when the value is set outside of an `@Input`.
      // This includes cases like the open, close and toggle methods.
      this._changeDetectorRef.markForCheck();
    }
  }
  private _visible = false;

  animationStart(_event: any) {}
  animationEnd(event: { toState: string }) {
    if (event.toState === 'visible') {
      this.afterVisible.emit();
      this._changeDetectorRef.markForCheck();
    } else if (event.toState === 'hidden') {
      this.afterHidden.emit();
      this._changeDetectorRef.markForCheck();
    }
  }
  ngAfterViewInit() {
    this._changeDetectorRef.detectChanges();
  }
}

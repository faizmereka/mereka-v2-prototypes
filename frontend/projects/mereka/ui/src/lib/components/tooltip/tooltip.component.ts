import { Component, input, signal } from '@angular/core';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'ui-tooltip',
  templateUrl: './tooltip.component.html',
})
export class UiTooltipComponent {
  readonly text = input.required<string>();
  readonly position = input<TooltipPosition>('top');

  readonly isVisible = signal(false);

  show(): void {
    this.isVisible.set(true);
  }

  hide(): void {
    this.isVisible.set(false);
  }

  get positionClasses(): string {
    const pos = this.position();
    switch (pos) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  }

  get pointerClasses(): string {
    const pos = this.position();
    switch (pos) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-neutral-800';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800 rotate-180';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-neutral-800 -rotate-90';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-neutral-800 rotate-90';
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-neutral-800';
    }
  }
}

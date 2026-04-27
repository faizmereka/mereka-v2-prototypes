/* eslint-disable @angular-eslint/component-class-suffix */
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  PLATFORM_ID,
  signal,
  viewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'ui-collapsible-text, [ui-collapsible-text]',
  templateUrl: './ui-collapsible-text.html',
  styleUrl: './ui-collapsible-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.is-collapsible]': 'isOverflowing()',
  },
})
export class UICollapsibleText implements AfterViewInit, OnDestroy {

  private readonly textElement = viewChild<ElementRef<HTMLDivElement>>('textElement');

  readonly text = input<string | undefined>('');
  readonly line = input<number>(4);

  readonly isCollapsed = signal(true);
  readonly isOverflowing = signal(false);

  // Dynamic style for line clamping
  currentLineClamp = computed(() => (this.isCollapsed() ? this.line() : 'unset'));

  private resizeObserver: ResizeObserver | null = null;
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = this.textElement()?.nativeElement;
      if (!element) {
        return;
      }

      this.resizeObserver = new ResizeObserver(() => {
        // Re-check overflow on resize
        this.checkOverflow(element);
        this.cdr.detectChanges();
      });

      this.resizeObserver.observe(element);

      // Perform initial check after styles are applied
      // Use requestAnimationFrame for better timing with rendering
      requestAnimationFrame(() => this.checkOverflow(element));
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.resizeObserver?.disconnect();
    }
  }

  toggle(): void {
    this.isCollapsed.update((v) => !v);
    // Note: We don't call checkOverflow here directly
    // The ResizeObserver will trigger if the expansion changes the element size significantly,
    // but the logic inside checkOverflow handles the state update correctly.
  }

  // Pass element explicitly to avoid issues with potential timing
  private checkOverflow(element: HTMLDivElement): void {
    if (!element) return;

    // Temporarily apply clamp style to measure potential height if collapsed
    const originalClamp = element.style.webkitLineClamp;
    element.style.webkitLineClamp = `${this.line()}`;

    const potentialOverflow = element.scrollHeight > element.clientHeight;

    // Restore original style before updating signals
    element.style.webkitLineClamp = originalClamp;

    // Update the overflow state based on the *potential* overflow
    this.isOverflowing.set(potentialOverflow);

    // If it potentially doesn't overflow, ensure it's expanded
    if (!potentialOverflow) {
      this.isCollapsed.set(false);
    }
  }
}

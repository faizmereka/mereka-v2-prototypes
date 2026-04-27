import { Component, input, output, signal, computed, contentChild, TemplateRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'ui-collapsible',
  imports: [CommonModule, IconComponent],
  templateUrl: './collapsible.component.html',
})
export class UiCollapsibleComponent {
  /** The title displayed in the header (optional if using custom header slot) */
  readonly title = input<string>('');

  /** Optional badge text to display next to the title */
  readonly badge = input<string>('');

  /** Badge variant - determines the color scheme */
  readonly badgeVariant = input<'primary' | 'neutral'>('primary');

  /** Whether the section is initially expanded */
  readonly expanded = input<boolean>(true);

  /** Emits when the expanded state changes */
  readonly expandedChange = output<boolean>();

  /** Internal expanded state */
  protected isExpanded = signal(true);

  /** Computed class for badge styling */
  protected badgeClass = computed(() => {
    return this.badgeVariant() === 'primary'
      ? 'bg-primary text-white'
      : 'bg-neutral-100 text-neutral-500';
  });

  ngOnInit(): void {
    this.isExpanded.set(this.expanded());
  }

  toggle(): void {
    this.isExpanded.update((v) => !v);
    this.expandedChange.emit(this.isExpanded());
  }
}

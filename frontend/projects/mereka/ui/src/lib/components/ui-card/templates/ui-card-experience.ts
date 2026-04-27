/* eslint-disable @angular-eslint/component-class-suffix, @typescript-eslint/no-explicit-any */
/*
 * IMPORTANT:
 * This UI component is intentionally self-contained for modularity and reusability purposes.
 * Please refrain from introducing external dependencies or altering its encapsulation.
 * Ensure any modifications preserve its standalone nature. Consult with the team for any changes
 * that might impact its self-contained design.
 */
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import {
  UICard,
  UICardBody,
  UICardImage,
  UICardLink,
  UICardTitle,
  UICardPriceLabelType,
} from '../ui-card';
import { UIButton, UIButtonIconDirective } from '@mereka/ui/ui-button/ui-button';

@Component({
  selector: 'ui-card-experience, [ui-card-experience]',
  templateUrl: './ui-card-experience.html',
  styleUrl: './ui-card-experience.scss',
  exportAs: 'uiCardExperience',
  host: {
    'class': 'ui-card-experience',
    '[id]': 'id() ? "item-"+id() : null',
    '[class.ui-card-experience--featured]': 'isFeatured()',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterModule,
    MatIcon,
    UIButton,
    UIButtonIconDirective,
    UICardImage,
    UICardTitle,
    UICardBody,
    UICardLink,
  ],
})
export class UICardExperience extends UICard implements OnInit {

  private static readonly LAYOUTS = ['', 'horizontal', 'horizontal-small', 'horizontal-reverse', 'horizontal-map'];

  readonly id = input<string>('');
  readonly url = input<string>('');
  readonly href = input<string>('');
  readonly image = input<string>('');
  readonly title = input<string>('');
  readonly location = input<string>('');
  readonly dates = input<number[]>([]);
  readonly host = input<string>('');
  readonly rating = input<number>(0);
  readonly price = input<UICardPriceLabelType>({});
  readonly badge = input<string>('');
  readonly metadata = input<string[]>([]);
  readonly isFavourite = input<boolean>(false);
  readonly isFeatured = input<boolean>(false);
  readonly hideElements = input<string[]>([]);

  readonly favorite = output<string>();
  readonly cardClick = output<string>();

  readonly displayDate = signal('');
  readonly displayPrice = signal<UICardPriceLabelType>({
    beforeLabel: 'From',
    afterLabel: '/ ticket',
  });

  readonly effectiveLayout = computed(() => {
    const v = this.layout();
    return UICardExperience.LAYOUTS.includes(v) ? v : '';
  });

  ngOnInit(): void {
    this.formatDates();
    this.displayPrice.set({ ...this.displayPrice(), ...this.price() });
  }

  formatDates(): void {
    const dates = this.dates();
    if (!dates?.length) return;
    const sortedDates = [...dates].sort((a, b) => a - b);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const closestFutureDateIndex = sortedDates.findIndex(
      (d) => new Date(d * 1000) >= today
    );

    if (closestFutureDateIndex === -1) {
      this.displayDate.set('');
      return;
    }

    const closestDate = new Date(sortedDates[closestFutureDateIndex] * 1000);
    const additionalDates =
      closestFutureDateIndex >= 0
        ? sortedDates.length - closestFutureDateIndex - 1
        : 0;

    let result: string;
    if (this.isToday(closestDate)) {
      result = 'Today';
    } else if (this.isTomorrow(closestDate)) {
      result = 'Tomorrow';
    } else {
      result = this.formatDate(closestDate);
    }
    if (additionalDates > 0) {
      result += ` + ${additionalDates} more`;
    }
    this.displayDate.set(result);
  }

  private formatDate(date: Date): string {
    const optionsDate: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    const optionsTime: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    const dateString = date.toLocaleString('en-US', optionsDate);
    const timeString = date.toLocaleString('en-US', optionsTime).toLowerCase();
    return `${dateString} ･ ${timeString}`;
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  private isTomorrow(date: Date): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  }

  onClick() {
    this.cardClick.emit(this.id());
  }

  toggleFavourite(e: Event) {
    this.favorite.emit(this.id());
    e.stopPropagation();
  }
}

export type UICardExperienceLayout = {
  beforeLabel?: string;
  afterLabel?: string;
  amount?: string;
};
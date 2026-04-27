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
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { UIAnchor, UIButton } from '@mereka/ui/ui-button/ui-button';
import {
  UICard,
  UICardBody,
  UICardLink,
  UICardRow,
  UICardTitle,
} from '../ui-card';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: 'a few seconds',
    m: 'a minute',
    mm: '%d minutes',
    h: 'an hour',
    hh: '%d hours',
    d: '1 day',
    dd: function (number: number) {
      if (number >= 7) {
        if (number >= 14 && number <= 30) {
          return `${Math.round(number / 7)} weeks`;
        }
        return `${Math.round(number / 7)} week`;
      }
      return `${number} days`;
    },
    w: '%d week',
    ww: '%d weeks',
    M: 'a month',
    MM: '%d months',
    y: 'a year',
    yy: '%d years',
  },
});

@Component({
  selector: 'ui-card-job, [ui-card-job]',
  templateUrl: './ui-card-job.html',
  styleUrl: './ui-card-job.scss',
  exportAs: 'uiCardJob',
  host: {
    'class': 'ui-card-job',
    '[id]': 'id() ? "item-"+id() : null',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    UIAnchor,
    UIButton,
    UICardTitle,
    UICardRow,
    UICardBody,
    UICardLink,
  ],
})
export class UICardJob extends UICard implements OnInit {

  readonly id = input<string>('');
  readonly url = input<string>('');
  readonly href = input<string>('');
  readonly title = input<string>('');
  readonly startDate = input<string | undefined>('');
  readonly endDate = input<{ key?: string; label?: string }>({});
  readonly createdDate = input<Date | string>('');
  readonly description = input<string>('');
  readonly expiry = input<number>(0);
  readonly client = input<string>('');
  readonly experienceLevel = input<string>('-');
  readonly location = input<{ address?: string }[] | string>('');
  readonly timeline = input<string>('');
  readonly budget = input<{ fromAmount?: number; pricingType?: string; upToAmount?: number }>({});
  readonly currency = input<{ key?: string; value?: string }>({});
  readonly tag = input<string>('');
  readonly buttonLink = input<string>('');
  readonly buttonText = input<string>('Learn More & Apply');
  readonly isClosed = input<boolean>(false);
  readonly _isPrivate = input<boolean>(false, { alias: 'isPrivate' });
  readonly hideElements = input<string[]>([]);

  readonly cardClick = output<string>();
  readonly contactClick = output<string>();

  readonly budgetLabel = signal('');
  readonly createdDateLabel = signal('');
  readonly locationLabel = signal('-');
  readonly startLabel = signal('');

  get isPrivate(): boolean {
    return coerceBooleanProperty(this._isPrivate());
  }

  ngOnInit(): void {
    const created = this.createdDate();
    if (created) {
      this.createdDateLabel.set(dayjs(created).fromNow());
    }

    const loc = this.location();
    if (loc) {
      if (typeof loc === 'string') {
        this.locationLabel.set(loc === 'virtual' ? 'Virtual' : loc === 'remote' ? 'Remote' : '-');
      } else if (loc.length > 0) {
        this.locationLabel.set(loc.map((item) => item['address']).join(', '));
      }
    }

    const start = this.startDate();
    if (start) {
      if (start === 'asap') {
        this.startLabel.set('ASAP');
      } else if (start === 'flexible') {
        this.startLabel.set('Open to discussion');
      } else {
        this.startLabel.set(dayjs(start).format('MMM D, YYYY'));
      }
    }

    const bud = this.budget();
    if (bud?.fromAmount != null) {
      let pricingType = '';
      if (bud.pricingType === 'hourly') {
        pricingType = 'Hourly';
      } else if (bud.pricingType) {
        pricingType = 'Fixed';
      }
      const currencySymbol = this.currency()?.value ?? '';
      let range = `${currencySymbol} ${bud.fromAmount}`;
      if (bud.upToAmount) {
        range += ` - ${currencySymbol} ${bud.upToAmount}`;
      }
      this.budgetLabel.set((pricingType ? pricingType + ': ' : '') + range);
    }
  }

  onContactClick() {
    this.contactClick.emit(this.id());
  }

  onClick() {
    this.cardClick.emit(this.id());
  }
}

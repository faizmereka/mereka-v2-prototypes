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
import { UIButton, UIButtonIconDirective } from '@mereka/ui/ui-button/ui-button';
import {
  UICard,
  UICardBody,
  UICardImage,
  UICardLink,
  UICardPriceLabelType,
  UICardRow,
  UICardTitle,
} from '../ui-card';
import { UIImage } from '@mereka/ui/ui-image/ui-image';

const EXPERTISE_LAYOUTS = ['', 'horizontal-reverse', 'horizontal-map'];

@Component({
  selector: 'ui-card-expertise, [ui-card-expertise]',
  templateUrl: './ui-card-expertise.html',
  styleUrl: './ui-card-expertise.scss',
  exportAs: 'uiCardExpertise',
  host: {
    'class': 'ui-card-expertise',
    '[class.ui-card-expertise--featured]': 'isFeatured()',
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
    UICardRow,
    UICardBody,
    UICardLink,
    UIImage,
  ],
})
export class UICardExpertise extends UICard implements OnInit {

  readonly id = input<string>('');
  readonly expertise = input<string>('  ');
  readonly url = input<string>('');
  readonly href = input<string>('');
  readonly image = input<string>('');
  readonly expertImage = input<string>('');
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly price = input<UICardPriceLabelType>({
    beforeLabel: 'From',
    afterLabel: '/ session',
    amount: '0.00',
  });
  readonly badge = input<string>('Featured');
  readonly location = input<string>('');
  readonly duration = input<string[]>([]);
  readonly isFavourite = input<boolean>(false);
  readonly isFeatured = input<boolean>(false);
  readonly hideElements = input<string[]>(['expert-image']);

  readonly favorite = output<string>();
  readonly cardClick = output<string>();

  readonly durationLabel = signal('');
  readonly displayDescription = signal('');

  readonly effectiveLayout = computed(() => {
    const v = this.layout();
    return EXPERTISE_LAYOUTS.includes(v) ? v : '';
  });

  ngOnInit(): void {
    const dur = this.duration();
    if (dur?.length > 0) {
      this.durationLabel.set(dur.join(', '));
    }
    let desc = this.description();
    if (desc?.length > 170) {
      desc = desc.substring(0, 170) + '...';
    }
    this.displayDescription.set(desc ?? '');
  }

  onClick() {
    this.cardClick.emit(this.id());
  }

  toggleFavourite() {
    this.favorite.emit(this.id());
  }
}

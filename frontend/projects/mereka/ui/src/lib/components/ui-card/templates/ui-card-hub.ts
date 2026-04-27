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
  ViewEncapsulation,
  input,
  output,
  computed,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import {
  UICard,
  UICardBody,
  UICardImage,
  UICardLink,
  UICardTitle,
} from '../ui-card';
import { UIButton } from '@mereka/ui/ui-button/ui-button';

const HUB_LAYOUTS = ['', 'compact'];

@Component({
  selector: 'ui-card-hub, [ui-card-hub]',
  templateUrl: './ui-card-hub.html',
  styleUrl: './ui-card-hub.scss',
  exportAs: 'uiCardHub',
  host: {
    'class': 'ui-card-hub',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    MatIcon,
    UIButton,
    UICardImage,
    UICardTitle,
    UICardBody,
    UICardLink,
  ],
})
export class UICardHub extends UICard {

  readonly id = input<string>('');
  readonly url = input<string>('');
  readonly href = input<string>('');
  readonly image = input<string>('');
  readonly title = input<string>('');
  readonly location = input<string>('');
  readonly category = input<string>('');
  readonly rating = input<number>(0);
  readonly metadata = input<string[]>([]);
  readonly isFavourite = input<boolean>(false);
  readonly hideElements = input<string[]>([]);

  readonly chat = output<string>();
  readonly favorite = output<string>();
  readonly cardClick = output<string>();

  readonly effectiveLayout = computed(() => {
    const v = this.layout();
    return HUB_LAYOUTS.includes(v) ? v : '';
  });

  onClick() {
    this.cardClick.emit(this.id());
  }

  toggleFavourite() {
    this.favorite.emit(this.id());
  }

  onChat() {
    this.chat.emit(this.id());
  }
}

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
import { MatIcon } from '@angular/material/icon';
import { UIButton, UIButtonIconDirective } from '@mereka/ui/ui-button/ui-button';
import {
  UICard,
  UICardBody,
  UICardImage,
  UICardLink,
  UICardRow,
  UICardTitle,
} from '../ui-card';
import { UIImage } from '@mereka/ui/ui-image/ui-image';

@Component({
  selector: 'ui-card-expert, [ui-card-expert]',
  templateUrl: './ui-card-expert.html',
  styleUrl: './ui-card-expert.scss',
  exportAs: 'uiCardExpert',
  host: {
    'class': 'ui-card-expert',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
export class UICardExpert extends UICard implements OnInit {

  readonly id = input<string>('');
  readonly url = input<string>('');
  readonly href = input<string>('');
  readonly image = input<string>('');
  readonly expertImage = input<string>('');
  readonly title = input<string>('');
  readonly expertise = input<string[]>([]);
  readonly description = input<string>('');
  readonly isFavourite = input<boolean>(false);
  readonly hideElements = input<string[]>(['hub-image']);

  readonly favorite = output<string>();
  readonly cardClick = output<string>();

  readonly expertiseLabel = signal('');
  override readonly hoverEffect = input<boolean>(false);
  
  ngOnInit() {
    this.updateExpertiseLabel();
  }

  private updateExpertiseLabel() {
    const exp = this.expertise();
    if (exp?.length) {
      this.expertiseLabel.set(exp.length === 1 ? exp[0] : exp[0] + ' + more');
    } else {
      this.expertiseLabel.set('');
    }
  }

  onClick() {
    this.cardClick.emit(this.id());
  }

  toggleFavourite() {
    this.favorite.emit(this.id());
  }
}

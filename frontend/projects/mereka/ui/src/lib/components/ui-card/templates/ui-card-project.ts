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
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  UICard,
  UICardBody,
  UICardImage,
  UICardLink,
  UICardTitle,
} from '../ui-card';

@Component({
  selector: 'ui-card-project, [ui-card-project]',
  imports: [
    RouterModule,
    UICardImage,
    UICardTitle,
    UICardBody,
    UICardLink,
  ],
  templateUrl: './ui-card-project.html',
  styleUrl: './ui-card-project.scss',
  exportAs: 'uiCardProject',
  host: {
    'class': 'ui-card-project',
    '[id]': 'id() ? "item-"+id() : null',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UICardProject extends UICard {

  readonly id = input<string>('');
  readonly url = input<string>('');
  readonly href = input<string>('');
  readonly image = input<string>('');
  readonly title = input<string>('');
  readonly date = input<string>('');
  readonly metadata = input<string[]>([]);
  readonly partners = input<string[]>([]);
  readonly hideElements = input<string[]>([]);

  readonly cardClick = output<string>();

  onClick() {
    this.cardClick.emit(this.id());
  }

  toggleFavourite(e: Event) {
    e.stopPropagation();
  }
}

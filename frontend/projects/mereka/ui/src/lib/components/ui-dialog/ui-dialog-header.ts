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
  ChangeDetectorRef,
  Component,
  contentChild,
  viewChild,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  input,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { MatDialogClose } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { UIDialogService } from './ui-dialog.service';
import { UIDialogTitle } from './ui-dialog-title';
import { UIButton, UIButtonIconDirective } from '@mereka/ui/ui-button/ui-button';

@Component({
  selector: 'ui-dialog-header, [ui-dialog-header]',
  templateUrl: './ui-dialog-header.html',
  styleUrl: './ui-dialog-header.scss',
  host: {
    'class': 'ui-dialog-header',
    '[class.ui-dialog-header--disable-close]': 'disableClose'
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UIDialogService],
  imports: [
    NgTemplateOutlet,
    MatDialogClose,
    UIButton,
    UIButtonIconDirective,
    UIDialogTitle,
    MatIcon,
  ],
})
export class UIDialogHeader {

  private readonly _changeDetectorRef = inject(ChangeDetectorRef);
  protected readonly uiDialogService = inject(UIDialogService);

  uiDialogHeaderContent = contentChild(TemplateRef);
  private readonly uiDialogHeaderIconRef = viewChild<ElementRef<HTMLDivElement>>('uiDialogHeaderIcon');

  readonly _disableClose = input<boolean>(false, { alias: 'disableClose' });

  get disableClose(): boolean {
    return coerceBooleanProperty(this._disableClose());
  }

  hasHeaderIconContent(): boolean {
    const el = this.uiDialogHeaderIconRef()?.nativeElement;
    return (el?.children?.length ?? 0) > 0;
  }
}

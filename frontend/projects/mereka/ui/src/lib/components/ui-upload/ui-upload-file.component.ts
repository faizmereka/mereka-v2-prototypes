/* eslint-disable @angular-eslint/component-class-suffix */
import { Component, ViewEncapsulation, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { UIAnchor, UIButton } from '@mereka/ui/ui-button/ui-button';
import { UIUploadDirective } from './ui-upload.directive';
import { UIUpload } from './ui-upload.component';

@Component({
  selector: 'ui-upload-file',
  imports: [UIUploadDirective, MatIcon, UIButton, UIAnchor],
  templateUrl: './ui-upload-file.component.html',
  styleUrl: './ui-upload-file.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UIUploadFile extends UIUpload {

  readonly maxFileSize = input<number>(100);
  readonly disabled = input<boolean>(false);
}

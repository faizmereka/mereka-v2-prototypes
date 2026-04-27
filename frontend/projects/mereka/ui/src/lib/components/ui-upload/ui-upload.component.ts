/* eslint-disable @angular-eslint/component-class-suffix */
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, ElementRef, ViewEncapsulation, input, output, viewChild } from '@angular/core';
import { UIUploadDirective } from './ui-upload.directive';

@Component({
  selector: 'ui-upload',
  imports: [UIUploadDirective],
  templateUrl: './ui-upload.component.html',
  styleUrl: './ui-upload.component.scss',
  animations: [
    trigger('fade', [
      state('*', style({ opacity: 1 })),
      state('void', style({ opacity: 0 })),
      transition('* <=> void, void => *', [
        animate('400ms cubic-bezier(0.4,0.0,0.2,1)'),
      ]),
    ]),
  ],
  host: {
    'class': 'ui-upload',
    '[class.is-uploading]': 'isUploading',
    '[class.is-dragover]': 'isDragOver',
  },
  encapsulation: ViewEncapsulation.None,
})
export class UIUpload {

  readonly src = input<string>('');
  readonly multiple = input<boolean>(false);
  readonly allowedMimeType = input<string[]>([]);

  readonly loaded = output<File[]>();
  readonly failed = output<unknown>();
  readonly removed = output<void>();
  readonly fileOver = output<unknown>();
  readonly fileDrop = output<FileList>();

  readonly inputFile = viewChild<ElementRef<HTMLElement>>('inputFile');

  _isDragOver = false;
  get isDragOver(): boolean {
    return this._isDragOver;
  }

  isUploading = false;

  onFileDrop(event: File[]): void {
    this.fileOver.emit(false);
    this.handleFiles(event);
    this._isDragOver = false;
  }

  onFileOver(e: File | unknown) {
    this.fileOver.emit(false);
    this._isDragOver = e !== null;
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      const fileArr: File[] = Array.from(files);
      this.handleFiles(fileArr);
    }
  }

  // protected _haveFiles(types: string[]): boolean {
  //   if (!types) {
  //     return false;
  //   }

  //   if (types.indexOf) {
  //     return types.indexOf('Files') !== -1;
  //   } else if (types.contains) {
  //     return types.contains('Files');
  //   } else {
  //     return false;
  //   }
  // }

  protected handleFiles(files: File[]) {
    const allowed = this.allowedMimeType();
    const validFiles = Array.from(files).filter(
      (file) => !allowed.length || allowed.includes(file.type)
    );
    this.loaded.emit(validFiles);
  }

  getFile() {
    return this.src();
  }

  upload() {
    this.inputFile()?.nativeElement.click();
  }

  /** Mark the component as ng-touched */
  touched = false;
  markAsTouched() {
    if (!this.touched) {
      this.touched = true;
    }
  }
}

export const FILE_TYPES = {
  Image: ['image/jpeg', 'image/png', 'image/gif'],
  Video: ['video/mp4', 'video/webm', 'video/ogg'],
  Document: ['application/pdf', 'application/msword', 'text/plain'],
};

export function arrayBufferToBase64(buffer: Iterable<number>) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

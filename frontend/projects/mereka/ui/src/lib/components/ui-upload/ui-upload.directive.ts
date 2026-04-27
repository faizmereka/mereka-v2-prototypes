import { Directive, ElementRef, HostListener, inject, input, output } from '@angular/core';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'ui-upload-drop, [ui-upload-drop]',
  host: {
    'class': 'ui-upload-dropzone',
  },
})
export class UIUploadDirective {

  protected readonly elementRef = inject(ElementRef);

  readonly multiple = input<boolean>(false);
  readonly allowedMimeType = input<string[]>([]);
  readonly allowedFileType = input<string[]>([]);

  readonly fileOver = output<boolean>();
  readonly fileDrop = output<File[]>();

  // Indicate drag status
  get isDragOver(): boolean {
    return this._isDragOver;
  }
  _isDragOver: boolean = false;

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    const transfer = event.dataTransfer;

    if (!transfer) {
      return;
    }

    this.preventAndStop(event);
    const allowed = this.allowedMimeType();
    const files: File[] = [];
    for (let i = 0; i < transfer.files.length; i++) {
      const file = transfer.files[i];
      if (allowed?.includes(file.type) || allowed?.includes('All')) {
        files.push(file);
        if (!this.multiple()) break;
      }
    }
    this._isDragOver = false;
    this.fileOver.emit(false);
    this.fileDrop.emit(files);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    const transfer = event.dataTransfer;

    if (!transfer) {
      return;
    }

    const types = Array.from(transfer.types);

    if (!this._haveFiles(types)) {
      return;
    }

    transfer.dropEffect = 'copy';
    this._isDragOver = true;
    this.preventAndStop(event);
    this.fileOver.emit(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: MouseEvent): void {
    if (event.currentTarget === this.elementRef.nativeElement) {
      return;
    }
    this._isDragOver = false;
    this.preventAndStop(event);
    this.fileOver.emit(false);
  }

  protected preventAndStop(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected _haveFiles(types: string[] | string): boolean {
    if (!types) {
      return false;
    }

    if (Array.isArray(types)) {
      return types.includes('Files');
    } else if (typeof types === 'string') {
      return types.indexOf('Files') !== -1;
    } else {
      return false;
    }
  }
}

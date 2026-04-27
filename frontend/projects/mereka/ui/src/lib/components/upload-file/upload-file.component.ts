import { Component, ElementRef, viewChild, input, output } from '@angular/core';
import type { UploadedFile } from '../upload-image';

@Component({
  selector: 'ui-upload-file',
  templateUrl: './upload-file.component.html',
})
export class UiUploadFileComponent {

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly accept = input<string>('*/*');
  readonly acceptLabel = input<string>('Any file type accepted');
  readonly multiple = input<boolean>(false);
  readonly maxSize = input<number>(10 * 1024 * 1024);

  readonly loaded = output<UploadedFile>();
  readonly loadedMultiple = output<UploadedFile[]>();
  readonly error = output<string>();

  isDragging = false;

  upload() {
    this.fileInput()?.nativeElement.click();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(input.files);
    }
  }

  private processFiles(files: FileList) {
    const uploadedFiles: UploadedFile[] = [];
    const maxSz = this.maxSize();
    const multi = this.multiple();

    Array.from(files).forEach((file) => {
      if (file.size > maxSz) {
        this.error.emit(`File ${file.name} exceeds maximum size of ${maxSz / 1024 / 1024}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const uploadedFile: UploadedFile = {
          file,
          preview,
          name: file.name,
          size: file.size,
        };
        uploadedFiles.push(uploadedFile);
        if (!multi) {
          this.loaded.emit(uploadedFile);
        } else if (uploadedFiles.length === files.length) {
          this.loadedMultiple.emit(uploadedFiles);
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

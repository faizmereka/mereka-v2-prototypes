import { Component, ElementRef, viewChild, input, output, model } from '@angular/core';

export interface UploadedFile {
  file: File;
  preview: string;
  name: string;
  size: number;
}

@Component({
  selector: 'ui-upload-image',
  templateUrl: './upload-image.component.html',
})
export class UiUploadImageComponent {

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly src = model<string | null>(null);
  readonly accept = input<string>('image/*');
  readonly multiple = input<boolean>(false);
  readonly showDragHint = input<boolean>(true);
  readonly displayType = input<'cover' | 'thumbnail' | 'avatar'>('cover');
  readonly maxSize = input<number>(5 * 1024 * 1024);

  readonly loaded = output<UploadedFile>();
  readonly loadedMultiple = output<UploadedFile[]>();
  readonly removed = output<void>();
  readonly error = output<string>();

  isDragging = false;

  upload() {
    this.fileInput()?.nativeElement.click();
  }

  removeImage() {
    this.src.set(null);
    this.removed.emit();
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
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
          this.src.set(preview);
          this.loaded.emit(uploadedFile);
        } else if (uploadedFiles.length === files.length) {
          this.loadedMultiple.emit(uploadedFiles);
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

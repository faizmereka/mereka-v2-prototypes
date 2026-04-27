import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA, IconComponent, UiUploadImageComponent } from '@mereka/ui';
import type { UploadedFile } from '@mereka/ui';

export interface PortfolioDialogData {
  mode: 'add' | 'edit';
  portfolio?: {
    title: string;
    description: string;
    year: number | string;
    projectLink: string;
    images: string[];
    startDate?: string;
    endDate?: string;
  };
}

export interface PortfolioDialogResult {
  title: string;
  description: string;
  year: number | string;
  projectLink: string;
  images: string[];
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-portfolio-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, UiUploadImageComponent],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">
          {{ data.mode === 'edit' ? 'Edit Project' : 'Add Project' }}
        </h2>
        <button type="button" (click)="close()" class="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <ui-icon name="close" class="w-5 h-5 text-neutral-500"></ui-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Project Title <span class="text-red-500">*</span></label>
          <input
            type="text"
            formControlName="title"
            placeholder="e.g., E-commerce Website Redesign"
            class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea
            formControlName="description"
            placeholder="Describe the project, your role, and the results..."
            rows="4"
            class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          ></textarea>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
            <input
              type="month"
              formControlName="startDate"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
            <input
              type="month"
              formControlName="endDate"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <!-- Project Link -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Project Link</label>
          <input
            type="url"
            formControlName="projectLink"
            placeholder="https://..."
            class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Project Images -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-2">Project Images</label>
          <div class="flex flex-wrap gap-3">
            @for (image of images(); track $index) {
              <div class="relative w-24 h-24 rounded-lg overflow-hidden border border-neutral-200">
                <img [src]="image" alt="Portfolio image" class="w-full h-full object-cover" />
                <button
                  type="button"
                  (click)="removeImage($index)"
                  class="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50"
                >
                  <ui-icon name="close" class="w-3 h-3 text-red-500"></ui-icon>
                </button>
              </div>
            }

            <ui-upload-image displayType="thumbnail" (loaded)="onImageLoaded($event)">
              <div class="w-24 h-24 border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center hover:border-primary cursor-pointer">
                <ui-icon name="plus" class="w-6 h-6 text-neutral-400"></ui-icon>
              </div>
            </ui-upload-image>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="form.invalid"
            class="px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ data.mode === 'edit' ? 'Save Changes' : 'Add Project' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PortfolioDialogComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<PortfolioDialogResult>);
  readonly data = inject<PortfolioDialogData>(DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    startDate: [''],
    endDate: [''],
    projectLink: [''],
  });

  readonly images = signal<string[]>([]);

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.portfolio) {
      this.form.patchValue({
        title: this.data.portfolio.title,
        description: this.data.portfolio.description,
        startDate: this.data.portfolio.startDate || '',
        endDate: this.data.portfolio.endDate || '',
        projectLink: this.data.portfolio.projectLink,
      });
      this.images.set(this.data.portfolio.images || []);
    }
  }

  onImageLoaded(file: UploadedFile): void {
    if (file?.preview) {
      this.images.update((imgs) => [...imgs, file.preview!]);
    }
  }

  removeImage(index: number): void {
    this.images.update((imgs) => {
      const newImgs = [...imgs];
      newImgs.splice(index, 1);
      return newImgs;
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.valid) {
      const result: PortfolioDialogResult = {
        ...this.form.value,
        images: this.images(),
      };
      this.dialogRef.close(result);
    }
  }
}

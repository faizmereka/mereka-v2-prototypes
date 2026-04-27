import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA, IconComponent } from '@mereka/ui';

export interface EducationDialogData {
  mode: 'add' | 'edit';
  education?: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    description: string;
  };
}

export interface EducationDialogResult {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  description: string;
}

@Component({
  selector: 'app-education-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">
          {{ data.mode === 'edit' ? 'Edit Education' : 'Add Education' }}
        </h2>
        <button type="button" (click)="close()" class="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <ui-icon name="close" class="w-5 h-5 text-neutral-500"></ui-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
        <!-- Institution -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Institution <span class="text-red-500">*</span></label>
          <input
            type="text"
            formControlName="institution"
            placeholder="e.g., University of Malaya"
            class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Degree and Field of Study -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Degree <span class="text-red-500">*</span></label>
            <input
              type="text"
              formControlName="degree"
              placeholder="e.g., Bachelor's Degree"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Field of Study</label>
            <input
              type="text"
              formControlName="fieldOfStudy"
              placeholder="e.g., Computer Science"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <!-- Dates -->
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

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea
            formControlName="description"
            placeholder="Describe your studies, achievements, activities..."
            rows="4"
            maxlength="200"
            class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          ></textarea>
          <div class="mt-1 text-right text-xs text-neutral-500">
            {{ form.get('description')?.value?.length || 0 }} / 200
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
            {{ data.mode === 'edit' ? 'Save Changes' : 'Add Education' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class EducationDialogComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<EducationDialogResult>);
  readonly data = inject<EducationDialogData>(DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    institution: ['', Validators.required],
    degree: ['', Validators.required],
    fieldOfStudy: [''],
    startDate: [''],
    endDate: [''],
    description: [''],
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.education) {
      this.form.patchValue(this.data.education);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

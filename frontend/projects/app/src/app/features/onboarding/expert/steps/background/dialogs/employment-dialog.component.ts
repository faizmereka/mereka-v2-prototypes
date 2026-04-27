import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA, IconComponent } from '@mereka/ui';

export interface EmploymentDialogData {
  mode: 'add' | 'edit';
  employment?: {
    title: string;
    company: string;
    city: string;
    country: string;
    startDate: string;
    endDate: string;
    isOngoing: boolean;
    description: string;
  };
}

export interface EmploymentDialogResult {
  title: string;
  company: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  description: string;
}

@Component({
  selector: 'app-employment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">
          {{ data.mode === 'edit' ? 'Edit Employment' : 'Add Employment' }}
        </h2>
        <button type="button" (click)="close()" class="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <ui-icon name="close" class="w-5 h-5 text-neutral-500"></ui-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
        <!-- Title and Company -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Job Title <span class="text-red-500">*</span></label>
            <input
              type="text"
              formControlName="title"
              placeholder="e.g., Senior Developer"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Company <span class="text-red-500">*</span></label>
            <input
              type="text"
              formControlName="company"
              placeholder="e.g., Acme Inc."
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <!-- Location -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">City</label>
            <input
              type="text"
              formControlName="city"
              placeholder="e.g., Kuala Lumpur"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Country</label>
            <input
              type="text"
              formControlName="country"
              placeholder="e.g., Malaysia"
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
              [disabled]="form.get('isOngoing')?.value"
              class="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-neutral-100"
            />
          </div>
        </div>

        <!-- Currently Working -->
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            formControlName="isOngoing"
            class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary"
          />
          <span class="text-sm text-neutral-700">I currently work here</span>
        </label>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea
            formControlName="description"
            placeholder="Describe your responsibilities and achievements..."
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
            {{ data.mode === 'edit' ? 'Save Changes' : 'Add Employment' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class EmploymentDialogComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<EmploymentDialogResult>);
  readonly data = inject<EmploymentDialogData>(DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    company: ['', Validators.required],
    city: [''],
    country: [''],
    startDate: [''],
    endDate: [''],
    isOngoing: [false],
    description: [''],
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.employment) {
      this.form.patchValue(this.data.employment);
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

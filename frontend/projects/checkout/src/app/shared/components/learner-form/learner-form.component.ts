import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface LearnerFormData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

@Component({
  selector: 'app-learner-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4 p-4 bg-neutral-50 rounded-lg">
      <!-- Header with index -->
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-neutral-900">
          @if (totalLearners() > 1) {
            Attendee {{ index() + 1 }}
          } @else {
            Your Details
          }
        </h4>

        @if (showCopyFromFirst() && index() > 0) {
          <button
            type="button"
            (click)="copyFromFirst.emit()"
            class="text-sm text-primary-600 hover:text-primary-700"
          >
            Copy from first
          </button>
        }
      </div>

      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">
          Full Name <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          [ngModel]="formData().name"
          (ngModelChange)="updateField('name', $event)"
          placeholder="Enter full name"
          class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          [class.border-red-500]="showErrors() && !formData().name"
        />
        @if (showErrors() && !formData().name) {
          <p class="mt-1 text-sm text-red-500">Name is required</p>
        }
      </div>

      <!-- Email -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">
          Email <span class="text-red-500">*</span>
        </label>
        <input
          type="email"
          [ngModel]="formData().email"
          (ngModelChange)="updateField('email', $event)"
          placeholder="email@example.com"
          class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          [class.border-red-500]="showErrors() && !isValidEmail(formData().email)"
        />
        @if (showErrors() && !formData().email) {
          <p class="mt-1 text-sm text-red-500">Email is required</p>
        } @else if (showErrors() && formData().email && !isValidEmail(formData().email)) {
          <p class="mt-1 text-sm text-red-500">Please enter a valid email</p>
        }
      </div>

      <!-- Phone -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">
          Phone Number <span class="text-red-500">*</span>
        </label>
        <div class="flex gap-2">
          <select
            [ngModel]="formData().countryCode"
            (ngModelChange)="updateField('countryCode', $event)"
            class="w-24 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="+60">+60</option>
            <option value="+65">+65</option>
            <option value="+1">+1</option>
            <option value="+44">+44</option>
            <option value="+91">+91</option>
            <option value="+86">+86</option>
          </select>
          <input
            type="tel"
            [ngModel]="formData().phone"
            (ngModelChange)="updateField('phone', $event)"
            placeholder="123456789"
            class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            [class.border-red-500]="showErrors() && !formData().phone"
          />
        </div>
        @if (showErrors() && !formData().phone) {
          <p class="mt-1 text-sm text-red-500">Phone number is required</p>
        }
      </div>
    </div>
  `,
})
export class LearnerFormComponent {
  readonly index = input(0);
  readonly totalLearners = input(1);
  readonly showCopyFromFirst = input(false);
  readonly showErrors = input(false);
  readonly initialData = input<LearnerFormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+60',
  });

  readonly formDataChange = output<LearnerFormData>();
  readonly copyFromFirst = output<void>();

  readonly formData = signal<LearnerFormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+60',
  });

  constructor() {
    effect(() => {
      const initial = this.initialData();
      this.formData.set({ ...initial });
    }, { allowSignalWrites: true });
  }

  updateField(field: keyof LearnerFormData, value: string): void {
    const updated = { ...this.formData(), [field]: value };
    this.formData.set(updated);
    this.formDataChange.emit(updated);
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValid(): boolean {
    const data = this.formData();
    return !!(data.name && data.email && this.isValidEmail(data.email) && data.phone);
  }
}

import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface BookerFormData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

@Component({
  selector: 'app-booker-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <!-- Info text -->
      <p class="text-sm text-neutral-600">
        A user account will be automatically created with your email address for you to easily view booking details.
        Booking information will also be sent directly to your email address for your convenience.
      </p>

      <!-- Google Sign In -->
      @if (showGoogleSignIn()) {
        <div class="space-y-4">
          <button
            type="button"
            (click)="onGoogleSignIn.emit()"
            class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="font-medium text-neutral-700">Sign in with Google</span>
          </button>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-neutral-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-neutral-500">OR</span>
            </div>
          </div>
        </div>
      }

      <!-- Form Fields - Single Row on Desktop, Stacked on Mobile -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Name</label>
          <input
            type="text"
            [ngModel]="formData().name"
            (ngModelChange)="updateField('name', $event)"
            placeholder="Name"
            class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
            [class.border-red-500]="showErrors() && !formData().name"
          />
          @if (showErrors() && !formData().name) {
            <p class="mt-1 text-sm text-red-500">Name is required</p>
          }
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Email</label>
          <input
            type="email"
            [ngModel]="formData().email"
            (ngModelChange)="updateField('email', $event)"
            placeholder="Email"
            class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors"
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
          <label class="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
          <div class="flex">
            <select
              [ngModel]="formData().countryCode"
              (ngModelChange)="updateField('countryCode', $event)"
              class="flex-shrink-0 px-3 py-3 border border-r-0 border-neutral-300 rounded-l-lg bg-neutral-50 text-neutral-700 focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="+60">🇲🇾 +60</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+91">🇮🇳 +91</option>
              <option value="+86">🇨🇳 +86</option>
              <option value="+977">🇳🇵 +977</option>
            </select>
            <input
              type="tel"
              [ngModel]="formData().phone"
              (ngModelChange)="updateField('phone', $event)"
              placeholder="3-2385 6789"
              class="flex-1 px-4 py-3 border border-neutral-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-black transition-colors min-w-0"
              [class.border-red-500]="showErrors() && !formData().phone"
            />
          </div>
          @if (showErrors() && !formData().phone) {
            <p class="mt-1 text-sm text-red-500">Phone number is required</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class BookerFormComponent {
  readonly showErrors = input(false);
  readonly showGoogleSignIn = input(true);
  readonly initialData = input<BookerFormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+60',
  });

  readonly formDataChange = output<BookerFormData>();
  readonly onGoogleSignIn = output<void>();

  readonly formData = signal<BookerFormData>({
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

  updateField(field: keyof BookerFormData, value: string): void {
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

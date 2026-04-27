import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AuthLayoutVariant = 'default' | 'business';

/**
 * Auth Base Layout Component
 * Two-column layout with branding for auth pages
 */
@Component({
  selector: 'auth-base-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col md:grid md:grid-cols-2 py-10 lg:grid-cols-[40%_1fr] min-h-screen bg-white">
      <!-- Left Column - Form Area -->
      <div class="flex flex-col h-full px-8">
        @if (showBack) {
          <nav class="mb-8">
            <!-- Mobile: Icon button -->
            <button
              type="button"
              (click)="onBack()"
              class="md:hidden w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-primary hover:bg-gray-50 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <!-- Desktop: Text button -->
            <button
              type="button"
              (click)="onBack()"
              class="hidden md:flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              <span class="text-sm font-medium">Back</span>
            </button>
          </nav>
        }

        <div class="flex flex-col items-center justify-center flex-1 w-full max-w-[370px] mx-auto gap-8">
          <!-- Logo -->
          <div class="w-full max-w-[180px]">
            <img src="assets/images/mereka-logo.svg" alt="Mereka" class="w-full h-auto" />
          </div>

          @if (variant === 'business') {
            <h1 class="text-xl font-semibold text-primary">Connect as Business</h1>
          }

          <!-- Content -->
          <div class="w-full">
            <ng-content></ng-content>
          </div>
        </div>
      </div>

      <!-- Right Column - Branding Area (hidden on mobile) -->
      <div class="hidden md:block">
        @if (variant === 'business') {
          <div
            class="flex flex-col justify-between h-full py-16 px-10 lg:py-24 lg:px-16 rounded-l-[20px] bg-cover bg-center"
            style="background-image: url('assets/images/auth/background-pink.svg')"
          >
            <div class="flex justify-end">
              <img src="assets/images/auth/rocket.svg" alt="" class="w-32 h-32 lg:w-36 lg:h-36" style="mix-blend-mode: darken" />
            </div>
            <h2 class="text-3xl lg:text-4xl xl:text-5xl font-semibold text-primary text-right max-w-[480px] ml-auto leading-tight font-[Poppins]">
              Start generating new income streams.
            </h2>
          </div>
        } @else {
          <div
            class="flex items-start h-full py-16 px-10 lg:py-24 lg:px-16 rounded-l-[20px] bg-cover bg-center"
            style="background-image: url('assets/images/auth/background.svg')"
          >
            <h2 class="text-6xl lg:text-4xl xl:text-7xl font-semibold text-primary max-w-[480px] leading-tight font-[Poppins]">
              Connect with leading Experts & Services.
            </h2>
          </div>
        }
      </div>
    </div>
  `,
})
export class AuthBaseLayoutComponent {
  @Input() variant: AuthLayoutVariant = 'default';
  @Input() showBack = true;
  @Output() back = new EventEmitter<void>();

  onBack(): void {
    this.back.emit();
  }
}

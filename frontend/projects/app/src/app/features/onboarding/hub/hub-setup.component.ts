import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  UiButtonComponent,
  UiFormPageComponent,
  UiFormPageHeaderComponent,
  UiFormPageBodyComponent,
  UiRadioCardComponent,
} from '@mereka/ui';

type SetupOption = 'profile' | 'dashboard' | '';

@Component({
  selector: 'app-hub-setup',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    UiButtonComponent,
    UiFormPageComponent,
    UiFormPageHeaderComponent,
    UiFormPageBodyComponent,
    UiRadioCardComponent,
  ],
  template: `
    <ui-form-page>
      <ui-form-page-header>
        <div logo class="flex items-center">
          <img src="assets/images/logo.svg" alt="Mereka" class="h-8" />
        </div>
      </ui-form-page-header>

      <ui-form-page-body containerClass="max-w-2xl">
        <div class="py-8">
          <!-- Success Message -->
          <div class="text-center mb-10">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">You have successfully signed up on Mereka!</h1>
            <p class="text-gray-600">Complete your profile to start growing your services.</p>
          </div>

          <!-- Share URL -->
          <div class="mb-10">
            <label class="block text-sm font-medium text-gray-700 mb-2">Your Hub URL</label>
            <div class="flex items-center gap-2">
              <div class="flex-1 px-4 py-2.5 bg-gray-100 rounded-lg text-gray-600 truncate">
                {{ shareUrl }}
              </div>
              <button
                type="button"
                (click)="copyUrl()"
                class="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Copy URL"
              >
                @if (copied()) {
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                } @else {
                  <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <!-- Path Selection -->
          <div class="mb-8">
            <p class="text-gray-700 font-medium mb-4">Choose your next path:</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ui-radio-card
                value="profile"
                [checked]="selection() === 'profile'"
                [recommended]="true"
                (selected)="setSelection($event)"
              >
                <div image class="w-full h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-3 flex items-center justify-center">
                  <svg class="w-16 h-16 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span title>Complete Profile</span>
                <span description>Fortify your profile so that you can start publishing services!</span>
              </ui-radio-card>

              <ui-radio-card
                value="dashboard"
                [checked]="selection() === 'dashboard'"
                (selected)="setSelection($event)"
              >
                <div image class="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  <svg class="w-16 h-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <span title>View Dashboard</span>
                <span description>Explore your dashboard to get acquainted with its features.</span>
              </ui-radio-card>
            </div>
          </div>

          <!-- CTA Button -->
          <div class="text-center">
            <ui-button
              size="lg"
              [disabled]="!selection()"
              [routerLink]="selection() === 'profile' ? '/onboarding/hub/profile' : '/dashboard'"
            >
              Let's go!
            </ui-button>
          </div>
        </div>
      </ui-form-page-body>
    </ui-form-page>
  `,
})
export class HubSetupComponent {
  selection = signal<SetupOption>('');
  copied = signal(false);
  shareUrl = 'https://mereka.io/hub/your-hub-name';

  copyUrl() {
    navigator.clipboard.writeText(this.shareUrl);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  setSelection(value: unknown) {
    this.selection.set(value as SetupOption);
  }
}

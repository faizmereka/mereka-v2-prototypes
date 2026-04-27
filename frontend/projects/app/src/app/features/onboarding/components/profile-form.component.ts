import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  UiInputComponent,
  UiTextareaComponent,
  UiPanelComponent,
  UiPanelHeaderComponent,
  UiPanelRowComponent,
  UiPanelRowTitleComponent,
  UiPanelRowDescComponent,
  UiPanelSidebarComponent,
  UiPanelSidebarTitleComponent,
  UiFormOptionalComponent,
  UiUploadImageComponent,
} from '@mereka/ui';

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  displayName: string;
  headline: string;
  bio: string;
  profilePhoto: string | null;
}

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UiInputComponent,
    UiTextareaComponent,
    UiPanelComponent,
    UiPanelHeaderComponent,
    UiPanelRowComponent,
    UiPanelRowTitleComponent,
    UiPanelRowDescComponent,
    UiPanelSidebarComponent,
    UiPanelSidebarTitleComponent,
    UiFormOptionalComponent,
    UiUploadImageComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Profile Photo -->
      <ui-panel>
        <ui-panel-header>Profile Photo</ui-panel-header>
        <ui-panel-row>
          <ui-panel-row-title>Upload your photo</ui-panel-row-title>
          <ui-panel-row-desc>
            Choose a clear, professional photo that represents you well.
          </ui-panel-row-desc>

          <div class="flex items-start gap-6">
            <ui-upload-image
              [src]="profilePhoto"
              displayType="thumbnail"
              (loaded)="onPhotoUploaded($event)"
              (removed)="onPhotoRemoved()"
            >
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Upload
              </button>
            </ui-upload-image>

            <div class="text-sm text-gray-500">
              <p class="mb-2">Recommended:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Square photo (1:1 ratio)</li>
                <li>At least 200x200 pixels</li>
                <li>JPG or PNG format</li>
              </ul>
            </div>
          </div>

          <ui-panel-sidebar>
            <ui-panel-sidebar-title>
              <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1z" />
              </svg>
              Tips
            </ui-panel-sidebar-title>
            <ul class="text-sm text-gray-600 space-y-2">
              <li>Use a recent photo</li>
              <li>Ensure good lighting</li>
              <li>Smile and look approachable</li>
            </ul>
          </ui-panel-sidebar>
        </ui-panel-row>
      </ui-panel>

      <!-- Personal Information -->
      <ui-panel>
        <ui-panel-header>Personal Information</ui-panel-header>
        <ui-panel-row>
          <ui-panel-row-title>Your name</ui-panel-row-title>
          <ui-panel-row-desc>
            Enter your first and last name as you'd like them to appear.
          </ui-panel-row-desc>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
              <ui-input
                [(ngModel)]="formData.firstName"
                placeholder="John"
                [maxLength]="50"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
              <ui-input
                [(ngModel)]="formData.lastName"
                placeholder="Doe"
                [maxLength]="50"
              />
            </div>
          </div>
        </ui-panel-row>

        <ui-panel-row>
          <ui-panel-row-title>
            Display Name <ui-form-optional />
          </ui-panel-row-title>
          <ui-panel-row-desc>
            This is how your name will appear publicly.
          </ui-panel-row-desc>

          <ui-input
            [(ngModel)]="formData.displayName"
            placeholder="e.g., John D."
            [maxLength]="30"
          />
        </ui-panel-row>

        <ui-panel-row last>
          <ui-panel-row-title>
            Headline <ui-form-optional />
          </ui-panel-row-title>
          <ui-panel-row-desc>
            A short tagline that describes you (e.g., "Software Engineer | Tech Enthusiast")
          </ui-panel-row-desc>

          <div>
            <ui-input
              [(ngModel)]="formData.headline"
              placeholder="What do you do?"
              [maxLength]="100"
            />
            <p class="mt-1.5 text-sm text-gray-400 text-right">
              {{ formData.headline.length }} / 100
            </p>
          </div>
        </ui-panel-row>
      </ui-panel>

      <!-- Bio -->
      <ui-panel>
        <ui-panel-header>About You</ui-panel-header>
        <ui-panel-row last>
          <ui-panel-row-title>
            Bio <ui-form-optional />
          </ui-panel-row-title>
          <ui-panel-row-desc>
            Tell us a bit about yourself, your interests, and what you're looking to learn.
          </ui-panel-row-desc>

          <div>
            <ui-textarea
              [(ngModel)]="formData.bio"
              placeholder="Share a bit about yourself..."
              [rows]="4"
              [maxLength]="500"
            />
            <p class="mt-1.5 text-sm text-gray-400 text-right">
              {{ formData.bio.length }} / 500
            </p>
          </div>

          <ui-panel-sidebar>
            <ui-panel-sidebar-title>
              <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              Example
            </ui-panel-sidebar-title>
            <p class="text-sm text-gray-600 italic">
              "I'm a marketing professional with 5 years of experience. I'm passionate about digital marketing and always looking to learn new skills to stay ahead of industry trends."
            </p>
          </ui-panel-sidebar>
        </ui-panel-row>
      </ui-panel>
    </div>
  `,
})
export class ProfileFormComponent {
  @Input() formData: ProfileFormData = {
    firstName: '',
    lastName: '',
    displayName: '',
    headline: '',
    bio: '',
    profilePhoto: null,
  };

  @Output() formDataChange = new EventEmitter<ProfileFormData>();

  profilePhoto: string | null = null;

  onPhotoUploaded(event: { preview: string }) {
    this.profilePhoto = event.preview;
    this.formData.profilePhoto = event.preview;
    this.emitChange();
  }

  onPhotoRemoved() {
    this.profilePhoto = null;
    this.formData.profilePhoto = null;
    this.emitChange();
  }

  private emitChange() {
    this.formDataChange.emit(this.formData);
  }
}

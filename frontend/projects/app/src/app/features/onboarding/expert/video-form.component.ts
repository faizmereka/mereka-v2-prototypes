import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UiInputComponent,
  UiPanelComponent,
  UiPanelHeaderComponent,
  UiPanelRowComponent,
  UiPanelRowTitleComponent,
  UiPanelRowDescComponent,
  UiPanelSidebarComponent,
  UiPanelSidebarTitleComponent,
  UiFormOptionalComponent,
} from '@mereka/ui';

@Component({
  selector: 'app-video-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiInputComponent,
    UiPanelComponent,
    UiPanelHeaderComponent,
    UiPanelRowComponent,
    UiPanelRowTitleComponent,
    UiPanelRowDescComponent,
    UiPanelSidebarComponent,
    UiPanelSidebarTitleComponent,
    UiFormOptionalComponent,
  ],
  template: `
    <ui-panel>
      <ui-panel-header>Intro Video</ui-panel-header>
      <ui-panel-row last>
        <ui-panel-row-title>
          Upload a video <ui-form-optional />
        </ui-panel-row-title>
        <ui-panel-row-desc>
          Spruce up your profile by adding an intro video. Let potential clients get to know you better!
        </ui-panel-row-desc>

        <div class="space-y-4">
          <div>
            <ui-input
              [(ngModel)]="videoUrl"
              type="url"
              placeholder="Insert valid YouTube or Vimeo link"
              [error]="isInvalid() ? 'Invalid URL' : ''"
            />
            @if (isInvalid()) {
              <p class="mt-1.5 text-sm text-red-600">
                The link must be a valid YouTube or Vimeo URL.
              </p>
            }
          </div>

          <!-- Video Preview -->
          @if (videoUrl() && !isInvalid()) {
            <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <div class="w-full h-full flex items-center justify-center text-gray-400">
                <div class="text-center">
                  <svg class="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-sm">Video preview will appear here</p>
                </div>
              </div>
            </div>
          }
        </div>

        <ui-panel-sidebar>
          <ui-panel-sidebar-title>
            <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1z" />
            </svg>
            Tips
          </ui-panel-sidebar-title>
          <ul class="text-sm text-gray-600 space-y-2">
            <li>Include a greeting and introduction</li>
            <li>Share your expertise and experience</li>
            <li>Keep it under 2 minutes</li>
            <li>Use good lighting and clear audio</li>
          </ul>
        </ui-panel-sidebar>
      </ui-panel-row>
    </ui-panel>
  `,
})
export class VideoFormComponent {
  videoUrl = signal('');

  private videoPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+/;

  isInvalid(): boolean {
    const url = this.videoUrl();
    return url.length > 0 && !this.videoPattern.test(url);
  }
}

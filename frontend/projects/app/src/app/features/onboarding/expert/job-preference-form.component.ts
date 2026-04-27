import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UiPanelComponent,
  UiPanelHeaderComponent,
  UiPanelRowComponent,
  UiPanelRowTitleComponent,
} from '@mereka/ui';

interface JobType {
  id: string;
  name: string;
  checked: boolean;
}

@Component({
  selector: 'app-job-preference-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiPanelComponent,
    UiPanelHeaderComponent,
    UiPanelRowComponent,
    UiPanelRowTitleComponent,
  ],
  template: `
    <ui-panel>
      <ui-panel-header>
        Job Preferences
        <span class="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">Optional</span>
      </ui-panel-header>
      <ui-panel-row last>
        <ui-panel-row-title>Are you currently seeking job opportunities?</ui-panel-row-title>

        <div class="space-y-4">
          <!-- Radio Group -->
          <div class="space-y-3">
            <label
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
              [class.border-primary-500]="!isJobSeeking()"
              [class.bg-primary-50]="!isJobSeeking()"
              [class.border-gray-200]="isJobSeeking()"
              [class.hover:border-gray-300]="isJobSeeking()"
            >
              <input
                type="radio"
                name="jobSeeking"
                [checked]="!isJobSeeking()"
                (change)="isJobSeeking.set(false)"
                class="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
              />
              <span class="text-sm font-medium text-gray-700">No, I am not currently seeking</span>
            </label>

            <label
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
              [class.border-primary-500]="isJobSeeking()"
              [class.bg-primary-50]="isJobSeeking()"
              [class.border-gray-200]="!isJobSeeking()"
              [class.hover:border-gray-300]="!isJobSeeking()"
            >
              <input
                type="radio"
                name="jobSeeking"
                [checked]="isJobSeeking()"
                (change)="isJobSeeking.set(true)"
                class="w-4 h-4 text-primary-500 border-gray-300 focus:ring-primary-500"
              />
              <span class="text-sm font-medium text-gray-700">Yes, I am available for:</span>
            </label>
          </div>

          <!-- Job Types (shown when seeking) -->
          @if (isJobSeeking()) {
            <div class="ml-8 p-4 bg-gray-50 rounded-lg">
              <div class="space-y-3">
                @for (jobType of jobTypes; track jobType.id) {
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="jobType.checked"
                      class="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span class="text-sm text-gray-700">{{ jobType.name }}</span>
                  </label>
                }
              </div>
            </div>
          }
        </div>
      </ui-panel-row>
    </ui-panel>
  `,
})
export class JobPreferenceFormComponent {
  isJobSeeking = signal(false);

  jobTypes: JobType[] = [
    { id: 'fulltime', name: 'Full-time employment', checked: false },
    { id: 'parttime', name: 'Part-time employment', checked: false },
    { id: 'contract', name: 'Contract/Freelance work', checked: false },
    { id: 'internship', name: 'Internship opportunities', checked: false },
    { id: 'remote', name: 'Remote work only', checked: false },
  ];
}

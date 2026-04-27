import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UiPanelComponent,
  UiPanelHeaderComponent,
  UiPanelRowComponent,
  UiPanelRowTitleComponent,
  UiPanelRowDescComponent,
  UiPanelSidebarComponent,
  UiPanelSidebarTitleComponent,
  UiInputComponent,
  IconComponent,
} from '@mereka/ui';

@Component({
  selector: 'expert-onboarding-title',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiPanelComponent,
    UiPanelHeaderComponent,
    UiPanelRowComponent,
    UiPanelRowTitleComponent,
    UiPanelRowDescComponent,
    UiPanelSidebarComponent,
    UiPanelSidebarTitleComponent,
    UiInputComponent,
    IconComponent,
  ],
  template: `
    <ui-panel>
      <ui-panel-header>
        Title
        @if (!title()) {
          <span headerActions>
            <ui-icon name="error" class="w-5 h-5 text-orange-500"></ui-icon>
          </span>
        }
      </ui-panel-header>

      <ui-panel-row last>
        <ui-panel-row-title>Indicate your title</ui-panel-row-title>
        <ui-panel-row-desc>
          Craft a compelling ad title that's concise and informative, highlighting your specialty, target audience or
          skill level, and your qualifications or experience.
        </ui-panel-row-desc>

        <div>
          <ui-input
            [(ngModel)]="title"
            (ngModelChange)="onTitleChange()"
            placeholder="Your Title"
            [maxLength]="100"
          />
        </div>

        <ui-panel-sidebar>
          <ui-panel-sidebar-title>
            <ui-icon name="help-circle" class="w-4 h-4 text-yellow-500"></ui-icon>
            <span>Tips</span>
          </ui-panel-sidebar-title>
          <div class="text-sm text-neutral-600">
            <p class="font-semibold mb-2">What works:</p>
            <ul class="list-disc list-inside space-y-1 mb-4">
              <li>Personal Finance Coach: Empowering Millennials with Debt-Free Lives, 100+ Success Stories</li>
              <li>Certified Digital Marketing Specialist tripling Traffic for 50+ SMEs Over 5 Years</li>
            </ul>
            <p class="font-semibold mb-2">What doesn't work:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>Finance Coach Offering Expertise</li>
            </ul>
          </div>
        </ui-panel-sidebar>
      </ui-panel-row>
    </ui-panel>
  `,
})
export class ExpertOnboardingTitleComponent implements OnInit {
  title = signal('');

  ngOnInit(): void {
    const savedData = localStorage.getItem('expertOnboardData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.title) {
          this.title.set(data.title);
        }
      } catch (e) {
        console.error('Error parsing saved data', e);
      }
    }
  }

  onTitleChange(): void {
    const data = { title: this.title() };
    const existing = localStorage.getItem('expertOnboardData');
    if (existing) {
      const existingData = JSON.parse(existing);
      localStorage.setItem('expertOnboardData', JSON.stringify({ ...existingData, ...data }));
    } else {
      localStorage.setItem('expertOnboardData', JSON.stringify(data));
    }
  }
}


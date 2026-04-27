import { Component, signal } from '@angular/core';
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
  UiFormOptionalComponent,
  UiCheckboxTileComponent,
  UiTileGridComponent,
  UiChipInputComponent,
} from '@mereka/ui';

interface Category {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-expertise-form',
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
    UiFormOptionalComponent,
    UiCheckboxTileComponent,
    UiTileGridComponent,
    UiChipInputComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Focus Area -->
      <ui-panel>
        <ui-panel-header>Focus Area</ui-panel-header>
        <ui-panel-row>
          <ui-panel-row-title>What would you say is your primary focus area?</ui-panel-row-title>
          <ui-panel-row-desc>
            Choose one of the following categories that best describes your expertise.
          </ui-panel-row-desc>

          <ui-tile-grid [columns]="3">
            @for (category of categories; track category.id) {
              <ui-checkbox-tile
                [checked]="selectedCategory() === category.id"
                (checkedChange)="selectCategory(category.id)"
              >
                <span icon class="text-2xl">{{ category.icon }}</span>
                {{ category.name }}
              </ui-checkbox-tile>
            }
          </ui-tile-grid>
        </ui-panel-row>
      </ui-panel>

      <!-- Skills -->
      <ui-panel>
        <ui-panel-header>Skills</ui-panel-header>
        <ui-panel-row>
          <ui-panel-row-title>
            What skills do you have? <ui-form-optional />
          </ui-panel-row-title>

          <div class="space-y-6">
            <!-- Primary Skills -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Primary Skills</label>
              <div class="flex flex-wrap gap-2 mb-3">
                @for (skill of primarySkills; track skill) {
                  <button
                    type="button"
                    (click)="togglePrimarySkill(skill)"
                    class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                    [class.bg-primary-500]="selectedPrimarySkills().includes(skill)"
                    [class.text-white]="selectedPrimarySkills().includes(skill)"
                    [class.border-primary-500]="selectedPrimarySkills().includes(skill)"
                    [class.bg-white]="!selectedPrimarySkills().includes(skill)"
                    [class.text-gray-700]="!selectedPrimarySkills().includes(skill)"
                    [class.border-gray-300]="!selectedPrimarySkills().includes(skill)"
                    [class.hover:border-gray-400]="!selectedPrimarySkills().includes(skill)"
                  >
                    {{ skill }}
                  </button>
                }
              </div>
            </div>

            <!-- Additional Skills -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Additional Skills</label>
              <div class="flex flex-wrap gap-2 mb-3">
                @for (skill of additionalSkills; track skill) {
                  <button
                    type="button"
                    (click)="toggleAdditionalSkill(skill)"
                    class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                    [class.bg-primary-500]="selectedAdditionalSkills().includes(skill)"
                    [class.text-white]="selectedAdditionalSkills().includes(skill)"
                    [class.border-primary-500]="selectedAdditionalSkills().includes(skill)"
                    [class.bg-white]="!selectedAdditionalSkills().includes(skill)"
                    [class.text-gray-700]="!selectedAdditionalSkills().includes(skill)"
                    [class.border-gray-300]="!selectedAdditionalSkills().includes(skill)"
                    [class.hover:border-gray-400]="!selectedAdditionalSkills().includes(skill)"
                  >
                    {{ skill }}
                  </button>
                }
              </div>
            </div>

            <!-- Custom Tags -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Create custom tags</label>
              <ui-chip-input
                [chips]="customTags()"
                (chipsChange)="customTags.set($event)"
                placeholder="Type skill and press Enter"
                [maxChips]="10"
              />
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
              <li>Choose skills that best represent your expertise</li>
              <li>Add custom tags for specific or niche skills</li>
              <li>You can always update these later</li>
            </ul>
          </ui-panel-sidebar>
        </ui-panel-row>
      </ui-panel>
    </div>
  `,
})
export class ExpertiseFormComponent {
  selectedCategory = signal<string | null>(null);
  selectedPrimarySkills = signal<string[]>([]);
  selectedAdditionalSkills = signal<string[]>([]);
  customTags = signal<string[]>([]);

  categories: Category[] = [
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'design', name: 'Design', icon: '🎨' },
    { id: 'marketing', name: 'Marketing', icon: '📈' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'health', name: 'Health & Wellness', icon: '🏃' },
    { id: 'arts', name: 'Arts & Culture', icon: '🎭' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
    { id: 'other', name: 'Other', icon: '🔮' },
  ];

  primarySkills = [
    'Leadership',
    'Strategy',
    'Communication',
    'Project Management',
    'Problem Solving',
    'Analytics',
    'Research',
    'Coaching',
  ];

  additionalSkills = [
    'Public Speaking',
    'Writing',
    'Data Analysis',
    'UX Design',
    'UI Design',
    'Web Development',
    'Mobile Development',
    'AI/Machine Learning',
    'Digital Marketing',
    'Social Media',
    'Content Creation',
    'Video Production',
  ];

  selectCategory(id: string) {
    this.selectedCategory.set(this.selectedCategory() === id ? null : id);
  }

  togglePrimarySkill(skill: string) {
    const current = this.selectedPrimarySkills();
    if (current.includes(skill)) {
      this.selectedPrimarySkills.set(current.filter((s) => s !== skill));
    } else {
      this.selectedPrimarySkills.set([...current, skill]);
    }
  }

  toggleAdditionalSkill(skill: string) {
    const current = this.selectedAdditionalSkills();
    if (current.includes(skill)) {
      this.selectedAdditionalSkills.set(current.filter((s) => s !== skill));
    } else {
      this.selectedAdditionalSkills.set([...current, skill]);
    }
  }
}

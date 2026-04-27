import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import {
  UiCollapsibleComponent,
  IconComponent,
  type IconName,
} from '@mereka/ui';
import { ExpertOnboardingService } from '../../services';

type Proficiency = 'basic' | 'conversational' | 'fluent' | 'native';

interface ProficiencyOption {
  value: Proficiency;
  label: string;
}

interface FocusAreaCard {
  id: string;
  name: string;
  icon: IconName;
}

@Component({
  selector: 'app-expert-skills',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    UiCollapsibleComponent,
    IconComponent,
  ],
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss'],
})
export class ExpertSkillsComponent implements OnInit {
  readonly onboarding = inject(ExpertOnboardingService);

  // Proficiency levels for language selection
  readonly proficiencyLevels: ProficiencyOption[] = [
    { value: 'basic', label: 'Basic' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'fluent', label: 'Fluent' },
    { value: 'native', label: 'Native/Bilingual' },
  ];

  // Focus area icons mapping (using valid IconName values)
  readonly focusAreaIcons: Record<string, IconName> = {
    'arts & culture': 'award',
    'career & business': 'briefcase',
    'design & branding': 'edit',
    'esg': 'leaf',
    'health & wellness': 'heart',
    'tech & ai': 'settings',
  };

  // Local state for skill inputs
  readonly primarySkillInput = signal('');
  readonly additionalSkillInput = signal('');
  readonly customTagInput = signal('');

  // Custom tags (user-created)
  readonly customTags = signal<string[]>([]);

  // Computed values
  readonly skillsForm = computed(() => this.onboarding.skillsForm);
  readonly languagesArray = computed(() => this.onboarding.languagesArray);

  // Focus areas as cards
  readonly focusAreaCards = computed<FocusAreaCard[]>(() => {
    return this.onboarding.focusAreas().map((area) => ({
      id: area._id,
      name: area.name,
      icon: this.getFocusAreaIcon(area.name),
    }));
  });

  readonly selectedFocusAreaId = computed(() => {
    return this.skillsForm().get('focusAreaId')?.value || '';
  });

  readonly languageOptions = computed(() => {
    return this.onboarding.languages().map((lang) => ({
      value: lang._id,
      label: lang.name,
    }));
  });

  // Get all available skills from API
  readonly allSkills = computed(() => this.onboarding.skills());

  // Selected skills
  readonly selectedSkills = computed(() => this.onboarding.selectedSkills());

  // Primary skills - skills that match the focus area (first selection)
  readonly selectedPrimarySkills = computed(() => {
    const skills = this.allSkills();
    const selected = this.selectedSkills();
    // We'll track primary skills separately - for now use first 5 selected
    return skills.filter((s) => selected.slice(0, 5).includes(s._id));
  });

  // Additional skills - rest of selected skills
  readonly selectedAdditionalSkills = computed(() => {
    const skills = this.allSkills();
    const selected = this.selectedSkills();
    return skills.filter((s) => selected.slice(5).includes(s._id));
  });

  // Available skills for primary selection
  readonly availablePrimarySkills = computed(() => {
    const selected = this.selectedSkills();
    return this.allSkills().filter((s) => !selected.includes(s._id));
  });

  // Filter skills based on input
  readonly filteredPrimarySkills = computed(() => {
    const input = this.primarySkillInput().toLowerCase();
    if (!input) return [];
    return this.availablePrimarySkills()
      .filter((s) => s.name.toLowerCase().includes(input))
      .slice(0, 10);
  });

  readonly filteredAdditionalSkills = computed(() => {
    const input = this.additionalSkillInput().toLowerCase();
    if (!input) return [];
    return this.availablePrimarySkills()
      .filter((s) => s.name.toLowerCase().includes(input))
      .slice(0, 10);
  });

  readonly jobPreferenceOptions = computed(() => {
    return this.onboarding.jobPreferences().map((pref) => ({
      value: pref._id,
      label: pref.name,
    }));
  });

  ngOnInit(): void {
    // Ensure onboarding service is initialized
    if (!this.onboarding.isInitialized()) {
      this.onboarding.initialize();
    }
  }

  // Focus Area selection
  selectFocusArea(focusAreaId: string): void {
    this.skillsForm().patchValue({ focusAreaId });
  }

  getFocusAreaIcon(name: string): IconName {
    const normalized = name.toLowerCase();
    return this.focusAreaIcons[normalized] || 'star';
  }

  isFocusAreaSelected(focusAreaId: string): boolean {
    return this.selectedFocusAreaId() === focusAreaId;
  }

  // Skills management
  onPrimarySkillSelect(skillId: string): void {
    this.onboarding.addSkill(skillId);
    this.primarySkillInput.set('');
  }

  onAdditionalSkillSelect(skillId: string): void {
    this.onboarding.addSkill(skillId);
    this.additionalSkillInput.set('');
  }

  removeSkill(skillId: string): void {
    this.onboarding.removeSkill(skillId);
  }

  onPrimarySkillInputChange(value: string): void {
    this.primarySkillInput.set(value);
  }

  onAdditionalSkillInputChange(value: string): void {
    this.additionalSkillInput.set(value);
  }

  // Custom tags management
  onCustomTagInputChange(value: string): void {
    this.customTagInput.set(value);
  }

  addCustomTag(): void {
    const tag = this.customTagInput().trim();
    if (tag && !this.customTags().includes(tag)) {
      this.customTags.update((tags) => [...tags, tag]);
      this.customTagInput.set('');
    }
  }

  removeCustomTag(tag: string): void {
    this.customTags.update((tags) => tags.filter((t) => t !== tag));
  }

  onCustomTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomTag();
    }
  }

  // Language management
  addLanguage(): void {
    this.onboarding.addLanguage();
  }

  removeLanguage(index: number): void {
    this.onboarding.removeLanguage(index);
  }

  getLanguageFormGroup(index: number): FormGroup {
    return this.languagesArray().at(index) as FormGroup;
  }

  getLanguageName(languageId: string): string {
    const lang = this.onboarding.languages().find((l) => l._id === languageId);
    return lang?.name || '';
  }

  // Get languages not yet selected
  getAvailableLanguagesForRow(currentIndex: number): Array<{ value: string; label: string }> {
    const selectedIds = this.languagesArray().controls.map((ctrl, i) => {
      if (i === currentIndex) return null;
      return ctrl.get('languageId')?.value;
    }).filter(Boolean) as string[];

    return this.languageOptions().filter((opt) => !selectedIds.includes(opt.value));
  }

  // Job preferences management
  isJobPreferenceSelected(prefId: string): boolean {
    return this.onboarding.selectedJobPreferences().includes(prefId);
  }

  toggleJobPreference(prefId: string): void {
    if (this.isJobPreferenceSelected(prefId)) {
      this.onboarding.removeJobPreference(prefId);
    } else {
      this.onboarding.addJobPreference(prefId);
    }
  }
}

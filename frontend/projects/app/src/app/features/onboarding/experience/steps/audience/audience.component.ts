import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UiCollapsibleComponent, UiTooltipComponent } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import { ReferenceDataService } from '../../../services/reference-data.service';

@Component({
  selector: 'app-experience-audience',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, UiCollapsibleComponent, UiTooltipComponent],
  templateUrl: './audience.component.html',
})
export class ExperienceAudienceComponent implements OnInit, OnDestroy {
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly destroy$ = new Subject<void>();

  // Form from service
  readonly form: FormGroup = this.onboardingService.audienceForm;

  // Reference data
  readonly targetAudiences = this.referenceData.targetAudiences;
  readonly languages = this.referenceData.languages;
  readonly skills = this.referenceData.skills;
  readonly isLoadingRef = this.referenceData.isLoading;

  // UI state
  skillInput = '';

  // Target audience type: 'everyone' or 'groups'
  readonly targetAudienceType = signal<'everyone' | 'groups'>('everyone');

  // Reactive signals for form values
  private readonly _audienceType = signal<string>('Everyone');
  private readonly _selectedAudiences = signal<string[]>([]);
  private readonly _expertiseLevel = signal<string>('');
  private readonly _expertiseFields = signal<string[]>([]);
  private readonly _primaryLanguage = signal<string>('English');
  private readonly _secondaryLanguages = signal<string[]>([]);

  // Public readonly signals
  readonly audienceType = this._audienceType.asReadonly();
  readonly selectedAudiences = this._selectedAudiences.asReadonly();
  readonly expertiseLevel = this._expertiseLevel.asReadonly();
  readonly expertiseFields = this._expertiseFields.asReadonly();
  readonly primaryLanguage = this._primaryLanguage.asReadonly();
  readonly secondaryLanguages = this._secondaryLanguages.asReadonly();

  // Derived: isHidden when audienceType is 'Hidden'
  readonly isHidden = computed(() => this.audienceType() === 'Hidden');

  // Fallback audience options if reference data not loaded
  // Note: id is the name (same as label) since backend expects names
  readonly fallbackAudienceOptions = [
    { id: 'Students', label: 'Students' },
    { id: 'Professionals', label: 'Professionals' },
    { id: 'Corporations', label: 'Corporations' },
    { id: 'Entrepreneurs', label: 'Entrepreneurs' },
    { id: 'Job Seekers', label: 'Job Seekers' },
    { id: 'Parents', label: 'Parents' },
  ];

  // Fallback language options if reference data not loaded
  readonly fallbackLanguageOptions = [
    { value: 'English', label: 'English' },
    { value: 'Bahasa Malaysia', label: 'Bahasa Malaysia' },
    { value: 'Chinese (Mandarin)', label: 'Chinese (Mandarin)' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
    { value: 'Thai', label: 'Thai' },
    { value: 'Vietnamese', label: 'Vietnamese' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Korean', label: 'Korean' },
  ];

  // Expertise level options (using capitalized values to match v1/backend)
  readonly expertiseLevelOptions = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Not Applicable', label: 'Not Applicable' },
  ];

  // Use reference data if available, otherwise use fallback
  // Note: We use '_id' as the value to store IDs in the database
  get audienceOptions() {
    const refData = this.targetAudiences();
    if (refData.length > 0) {
      return refData.map(a => ({ id: a._id, label: a.name }));
    }
    return this.fallbackAudienceOptions;
  }

  get languageOptions() {
    const refData = this.languages();
    if (refData.length > 0) {
      return refData.map(l => ({ value: l.name, label: l.name }));
    }
    return this.fallbackLanguageOptions;
  }

  ngOnInit(): void {
    // Set current step
    this.onboardingService.setCurrentStep('audience');

    // Load reference data
    this.loadReferenceData();

    // Initialize signals from current form values
    this.syncFormToSignals();

    // Subscribe to form value changes to keep signals in sync
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.syncFormToSignals();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadReferenceData(): Promise<void> {
    await Promise.all([
      this.referenceData.loadTargetAudiences(),
      this.referenceData.loadLanguages(),
    ]);
  }

  private syncFormToSignals(): void {
    this._audienceType.set(this.form.get('audienceType')?.value || 'Everyone');
    const audiences = this.form.get('targetAudience')?.value || [];
    this._selectedAudiences.set(audiences);
    this._expertiseLevel.set(this.form.get('expertiseLevel')?.value || '');
    this._expertiseFields.set(this.form.get('expertiseFields')?.value || []);
    this._primaryLanguage.set(this.form.get('primaryLanguage')?.value || 'English');
    this._secondaryLanguages.set(this.form.get('secondaryLanguage')?.value || []);

    // Set target audience type based on selected audiences
    if (audiences.length > 0) {
      this.targetAudienceType.set('groups');
    }
  }

  // ============================================================================
  // Target Audience Type (UI state for "Everyone" vs "Specific Groups")
  // ============================================================================

  onTargetAudienceTypeChange(type: 'everyone' | 'groups'): void {
    this.targetAudienceType.set(type);
    if (type === 'everyone') {
      // Clear selected audiences when switching to "Everyone"
      this.form.patchValue({ targetAudience: [] });
    }
  }

  // ============================================================================
  // Access Type
  // ============================================================================

  onAccessTypeChange(type: 'Everyone' | 'Members Only'): void {
    this.form.patchValue({ audienceType: type });
  }

  onHiddenChange(hidden: boolean): void {
    if (hidden) {
      this.form.patchValue({ audienceType: 'Hidden' });
    } else {
      this.form.patchValue({ audienceType: 'Everyone' });
    }
  }

  // ============================================================================
  // Target Audience
  // ============================================================================

  toggleAudienceOption(id: string): void {
    const current = this.selectedAudiences();
    if (current.includes(id)) {
      this.form.patchValue({
        targetAudience: current.filter(a => a !== id),
      });
    } else {
      this.form.patchValue({
        targetAudience: [...current, id],
      });
    }
  }

  isAudienceSelected(id: string): boolean {
    return this.selectedAudiences().includes(id);
  }

  // ============================================================================
  // Expertise Level
  // ============================================================================

  onExpertiseLevelChange(level: string): void {
    this.form.patchValue({ expertiseLevel: level });
    // Clear expertise fields if not applicable or beginner
    if (level === 'not-applicable' || level === 'beginner') {
      this.form.patchValue({ expertiseFields: [] });
    }
  }

  addSkill(): void {
    const trimmed = this.skillInput.trim();
    if (trimmed && !this.expertiseFields().includes(trimmed)) {
      this.form.patchValue({
        expertiseFields: [...this.expertiseFields(), trimmed],
      });
      this.skillInput = '';
    }
  }

  removeSkill(skill: string): void {
    this.form.patchValue({
      expertiseFields: this.expertiseFields().filter(s => s !== skill),
    });
  }

  // ============================================================================
  // Language
  // ============================================================================

  onPrimaryLanguageChange(value: string): void {
    this.form.patchValue({ primaryLanguage: value });
  }

  onSecondaryLanguageChange(value: string): void {
    if (value && !this.secondaryLanguages().includes(value)) {
      this.form.patchValue({
        secondaryLanguage: [...this.secondaryLanguages(), value],
      });
    }
  }

  removeSecondaryLanguage(lang: string): void {
    this.form.patchValue({
      secondaryLanguage: this.secondaryLanguages().filter(l => l !== lang),
    });
  }

  getLanguageLabel(value: string): string {
    const lang = this.languageOptions.find(l => l.value === value);
    return lang ? lang.label : value;
  }

  getAudienceLabel(id: string): string {
    const audience = this.audienceOptions.find(a => a.id === id);
    return audience ? audience.label : id;
  }
}

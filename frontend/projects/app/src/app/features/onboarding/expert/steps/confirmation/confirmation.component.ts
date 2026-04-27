import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiPanelComponent, UiPanelRowComponent, IconComponent } from '@mereka/ui';
import { ExpertOnboardingService } from '../../services';
import type { ExpertOnboardingData, ExpertValidationError } from '../../models';

@Component({
  selector: 'app-expert-confirmation',
  standalone: true,
  imports: [CommonModule, UiPanelComponent, UiPanelRowComponent, IconComponent],
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.scss'],
})
export class ExpertConfirmationComponent implements OnInit {
  private readonly router = inject(Router);
  readonly onboarding = inject(ExpertOnboardingService);

  // Submission state
  readonly isSubmitting = signal(false);
  readonly submissionError = signal<string | null>(null);

  // Get the form data
  readonly formData = computed(() => this.onboarding.getFormData());

  // Validation
  readonly validationErrors = computed(() => this.onboarding.getValidationErrors());
  readonly isValid = computed(() => this.validationErrors().length === 0);

  // Profile data
  readonly profilePhoto = computed(() => this.formData().profilePhoto || '');
  readonly coverPhoto = computed(() => this.formData().coverPhoto || '');
  readonly name = computed(() => this.formData().name || '');
  readonly username = computed(() => this.formData().username || '');
  readonly bio = computed(() => this.formData().bio || '');
  readonly phoneNumber = computed(() => this.formData().phoneNumber || '');
  readonly location = computed(() => {
    const loc = this.formData().location;
    if (loc?.city && loc?.country) {
      return `${loc.city}, ${loc.country}`;
    }
    return loc?.city || loc?.country || '';
  });

  // Skills data
  readonly professionalTitle = computed(() => this.formData().professionalTitle || '');
  readonly hourlyRate = computed(() => this.formData().hourlyRate);
  readonly currency = computed(() => this.formData().currency || 'MYR');

  // Get skill names from IDs
  readonly skillNames = computed(() => {
    const skillIds = this.formData().skills || [];
    const allSkills = this.onboarding.skills();
    return allSkills.filter((s) => skillIds.includes(s._id)).map((s) => s.name);
  });

  // Get focus area name
  readonly focusAreaName = computed(() => {
    const focusAreaId = this.formData().focusAreaId;
    if (!focusAreaId) return '';
    const area = this.onboarding.focusAreas().find((a) => a._id === focusAreaId);
    return area?.name || '';
  });

  // Get language names with proficiency
  readonly languagesDisplay = computed(() => {
    const langs = this.formData().languages || [];
    const allLanguages = this.onboarding.languages();
    return langs.map((l) => {
      const lang = allLanguages.find((al) => al._id === l.languageId);
      return {
        name: lang?.name || '',
        proficiency: l.proficiency,
      };
    });
  });

  // Get job preference names
  readonly jobPreferenceNames = computed(() => {
    const prefIds = this.formData().jobPreferences || [];
    const allPrefs = this.onboarding.jobPreferences();
    return allPrefs.filter((p) => prefIds.includes(p._id)).map((p) => p.name);
  });

  // Background data
  readonly portfolio = computed(() => this.formData().portfolio || []);
  readonly employment = computed(() => this.formData().employment || []);
  readonly education = computed(() => this.formData().education || []);

  // Social links
  readonly socialLinks = computed(() => {
    const links = this.formData().socialLinks;
    if (!links) return [];

    const result: Array<{ name: string; url: string }> = [];
    if (links.website) result.push({ name: 'Website', url: links.website });
    if (links.linkedin) result.push({ name: 'LinkedIn', url: links.linkedin });
    if (links.instagram) result.push({ name: 'Instagram', url: links.instagram });
    if (links.twitter) result.push({ name: 'Twitter/X', url: links.twitter });
    if (links.facebook) result.push({ name: 'Facebook', url: links.facebook });
    return result;
  });

  ngOnInit(): void {
    // Ensure onboarding service is initialized
    if (!this.onboarding.isInitialized()) {
      this.onboarding.initialize();
    }
  }

  navigateToStep(step: 'your-profile' | 'your-skills' | 'your-background'): void {
    this.onboarding.setCurrentStep(step);
    this.router.navigate(['/onboarding/expert', step]);
  }

  async submit(): Promise<void> {
    if (!this.isValid()) {
      this.submissionError.set('Please fix the validation errors before submitting.');
      return;
    }

    this.isSubmitting.set(true);
    this.submissionError.set(null);

    try {
      const success = await this.onboarding.submit();

      if (success) {
        // Navigate based on return URL or default to hub dashboard
        const returnUrl = this.onboarding.returnUrl();
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          // Check if user came from hub onboarding
          this.router.navigate(['/hub/dashboard']);
        }
      } else {
        this.submissionError.set('Failed to save your profile. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting profile:', error);
      this.submissionError.set('An error occurred while saving your profile.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getProficiencyLabel(proficiency: string): string {
    const labels: Record<string, string> = {
      basic: 'Basic',
      conversational: 'Conversational',
      fluent: 'Fluent',
      native: 'Native/Bilingual',
    };
    return labels[proficiency] || proficiency;
  }
}

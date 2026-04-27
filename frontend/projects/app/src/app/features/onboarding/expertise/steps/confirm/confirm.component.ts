import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExpertiseOnboardingService } from '../../services/expertise-onboarding.service';
import { ReferenceDataService } from '../../../services/reference-data.service';

@Component({
  selector: 'app-expertise-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm.component.html',
})
export class ExpertiseConfirmComponent {
  private readonly router = inject(Router);
  private readonly onboardingService = inject(ExpertiseOnboardingService);
  private readonly referenceData = inject(ReferenceDataService);

  // Loading and submission state
  readonly isSubmitting = this.onboardingService.isSaving;
  readonly isEditMode = this.onboardingService.isEditMode;

  // Share dialog state
  readonly showShareDialog = signal(false);
  readonly shareUrl = signal('');
  readonly copySuccess = signal(false);

  // Get all data from service
  readonly allData = computed(() => this.onboardingService.getAllData());

  // Computed summaries
  readonly basicInfo = computed(() => this.allData().basicInfo);
  readonly booking = computed(() => this.allData().booking);
  readonly pricing = computed(() => this.allData().pricing);
  readonly page = computed(() => this.allData().page);

  // Validation states for each section
  readonly basicInfoValid = computed(() => {
    const info = this.basicInfo();
    return !!(info.expertiseTitle && info.slug && info.expertiseSummary);
  });

  readonly bookingValid = computed(() => {
    const bookingData = this.booking();
    return !!(bookingData.availabilityType);
  });

  readonly pricingValid = computed(() => {
    const tickets = this.pricing().tickets || [];
    return tickets.length > 0;
  });

  readonly pageValid = computed(() => {
    const pageData = this.page();
    return !!(pageData.coverPhoto);
  });

  // Validation
  readonly isReadyToPublish = computed(() => this.onboardingService.isReadyToPublish());

  // Computed display values
  readonly expertiseTitle = computed(() => this.basicInfo().expertiseTitle || 'Untitled Expertise');
  readonly slug = computed(() => this.basicInfo().slug || '');
  readonly coverPhoto = computed(() => this.page().coverPhoto || '');
  readonly expertiseMode = computed(() => {
    const tickets = this.pricing().tickets || [];
    if (tickets.length === 0) return 'online';
    const modes = tickets.map((t: { expertiseMode?: string }) => t.expertiseMode || 'online');
    if (modes.includes('physical') && modes.includes('online')) return 'both';
    if (modes.includes('physical')) return 'offline';
    return 'online';
  });

  // Format helpers
  readonly formattedTickets = computed(() => {
    const tickets = this.pricing().tickets || [];
    return tickets.map((t: { ticketName: string; ticketType: string; ticketPrice: number; sessionDuration: number; durationUnit: string; expertiseMode?: string }) => ({
      name: t.ticketName || 'Untitled Package',
      type: t.ticketType,
      price: t.ticketType === 'Free' ? 'Free' : `MYR ${t.ticketPrice?.toFixed(2)}`,
      duration: `${t.sessionDuration} ${t.durationUnit}`,
      mode: t.expertiseMode === 'physical' ? 'In-Person' : 'Online',
    }));
  });

  readonly availabilityLabel = computed(() => {
    const type = this.booking().availabilityType;
    return type === 'flexible' ? 'Flexible' : 'Set Operating Hours';
  });

  readonly customQuestionsCount = computed(() => {
    const questions = this.page().customQuestions?.questionArray || [];
    return questions.length;
  });

  // ============================================================================
  // Navigation
  // ============================================================================

  navigateToStep(step: string): void {
    const expertiseId = this.onboardingService.expertiseId();
    if (expertiseId) {
      this.router.navigate(['/onboarding/expertise', expertiseId, step]);
    } else {
      this.router.navigate(['/onboarding/expertise', step]);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  getLanguagesDisplay(): string {
    const primary = this.basicInfo().primaryLanguage || 'English';
    const secondary = this.basicInfo().secondaryLanguages || [];
    if (secondary.length > 0) {
      return `${primary}, ${secondary.join(', ')}`;
    }
    return primary;
  }

  getExpertiseTypesDisplay(): string {
    const types = this.basicInfo().expertiseTypes || [];
    if (types.length === 0) return 'Not specified';
    return types.join(', ');
  }

  getExpertiseAccessDisplay(): string {
    const access = this.basicInfo().expertiseAccess || [];
    if (access.length === 0) return 'Not specified';
    return access.join(', ');
  }

  getFeePaidByText(): string {
    return this.pricing().feePaidBy === 'learner' ? 'Learner (pass-through)' : 'Hub (absorbed)';
  }

  getTicketSummary(): string {
    const tickets = this.pricing().tickets || [];
    if (tickets.length === 0) return 'No tickets';
    const paidCount = tickets.filter((t: { ticketType: string }) => t.ticketType === 'Paid').length;
    const freeCount = tickets.filter((t: { ticketType: string }) => t.ticketType === 'Free').length;
    const parts: string[] = [];
    if (paidCount > 0) parts.push(`${paidCount} paid`);
    if (freeCount > 0) parts.push(`${freeCount} free`);
    return parts.join(', ');
  }

  getModeLabel(): string {
    const mode = this.expertiseMode();
    switch (mode) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'In-person';
      case 'both':
        return 'Online & In-person';
      default:
        return mode;
    }
  }

  // ============================================================================
  // Share Dialog
  // ============================================================================

  openShareDialog(): void {
    const baseUrl = window.location.origin;
    const slugValue = this.slug();
    this.shareUrl.set(`${baseUrl}/expertise/${slugValue}`);
    this.showShareDialog.set(true);
  }

  closeShareDialog(): void {
    this.showShareDialog.set(false);
    this.copySuccess.set(false);
  }

  async copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }

  // ============================================================================
  // Actions
  // ============================================================================

  goToExpertises(): void {
    this.router.navigate(['/hub/services/expertise']);
  }
}

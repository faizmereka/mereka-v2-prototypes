import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import { ReferenceDataService } from '../../../services/reference-data.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-experience-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm.component.html',
})
export class ExperienceConfirmComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly referenceData = inject(ReferenceDataService);

  // Loading and submission state
  readonly isSubmitting = this.onboardingService.isSaving;
  readonly isEditMode = this.onboardingService.isEditMode;

  // Share dialog state
  readonly showShareDialog = signal(false);
  readonly shareUrl = signal('');
  readonly copySuccess = signal(false);

  // Basic Info computed values
  readonly experienceTitle = computed(() =>
    this.onboardingService.basicInfoForm.get('experienceTitle')?.value || 'N/a'
  );
  readonly slug = computed(() =>
    this.onboardingService.basicInfoForm.get('slug')?.value || ''
  );
  readonly experienceCategory = computed(() =>
    this.onboardingService.basicInfoForm.get('experienceCategory')?.value || ''
  );
  readonly experienceTopics = computed(() =>
    this.onboardingService.basicInfoForm.get('experienceTopics')?.value || []
  );
  readonly experienceType = computed(() =>
    this.onboardingService.basicInfoForm.get('experienceType')?.value || 'Physical'
  );
  readonly location = computed(() =>
    this.onboardingService.basicInfoForm.get('location')?.value || null
  );
  readonly meetingLink = computed(() =>
    this.onboardingService.basicInfoForm.get('meetingLink')?.value || ''
  );
  readonly hostDetails = computed(() =>
    this.onboardingService.basicInfoForm.get('hostDetails')?.value || []
  );

  // Audience computed values
  readonly audienceType = computed(() =>
    this.onboardingService.audienceForm.get('audienceType')?.value || 'Everyone'
  );
  readonly targetAudience = computed(() =>
    this.onboardingService.audienceForm.get('targetAudience')?.value || []
  );
  readonly expertiseLevel = computed(() =>
    this.onboardingService.audienceForm.get('expertiseLevel')?.value || ''
  );
  readonly primaryLanguage = computed(() =>
    this.onboardingService.audienceForm.get('primaryLanguage')?.value || ''
  );
  readonly secondaryLanguages = computed(() =>
    this.onboardingService.audienceForm.get('secondaryLanguage')?.value || []
  );

  // Booking computed values
  readonly durationHours = computed(() =>
    this.onboardingService.bookingForm.get('durationHours')?.value || 0
  );
  readonly durationMinutes = computed(() =>
    this.onboardingService.bookingForm.get('durationMinutes')?.value || 0
  );
  readonly timeZone = computed(() =>
    this.onboardingService.bookingForm.get('timeZone')?.value || ''
  );
  readonly schedules = computed(() =>
    this.onboardingService.bookingForm.get('schedules')?.value || []
  );

  // Tickets computed values
  readonly feePaidBy = computed(() =>
    this.onboardingService.ticketsForm.get('feePaidBy')?.value || 'learner'
  );
  readonly tickets = computed(() =>
    this.onboardingService.ticketsForm.get('tickets')?.value || []
  );

  // Page computed values
  readonly experienceDescription = computed(() =>
    this.onboardingService.pageForm.get('experienceDescription')?.value || ''
  );
  readonly coverPhoto = computed(() =>
    this.onboardingService.pageForm.get('coverPhoto')?.value || ''
  );
  readonly gallery = computed(() =>
    this.onboardingService.pageForm.get('gallery')?.value || []
  );
  readonly video = computed(() =>
    this.onboardingService.pageForm.get('video')?.value || ''
  );

  // Details computed values
  readonly learnerOutcome = computed(() =>
    this.onboardingService.detailsForm.get('learnerOutcome')?.value || ''
  );
  readonly instruction = computed(() =>
    this.onboardingService.detailsForm.get('instruction')?.value || ''
  );
  readonly materialProvided = computed(() => {
    const value = this.onboardingService.detailsForm.get('materialProvided')?.value || '';
    if (!value) return [];
    if (typeof value === 'string') {
      return value.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
    }
    return value as string[];
  });
  readonly materialNeedToBring = computed(() => {
    const value = this.onboardingService.detailsForm.get('materialNeedToBring')?.value || '';
    if (!value) return [];
    if (typeof value === 'string') {
      return value.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
    }
    return value as string[];
  });
  readonly customQuestions = computed(() =>
    this.onboardingService.detailsForm.get('customQuestions')?.value?.questionArray || []
  );

  // Validation status for each section
  readonly basicInfoValid = computed(() => this.onboardingService.basicInfoForm.valid);
  readonly audienceValid = computed(() => this.onboardingService.audienceForm.valid);
  readonly bookingValid = computed(() => {
    const form = this.onboardingService.bookingForm;
    return form.valid && (this.schedules().length > 0 || this.durationHours() > 0);
  });
  readonly ticketsValid = computed(() => {
    const tickets = this.tickets();
    return tickets.length > 0;
  });
  readonly pageValid = computed(() => {
    const desc = this.experienceDescription();
    return desc && desc.trim().length > 0;
  });

  readonly canPublish = computed(() =>
    this.basicInfoValid() &&
    this.bookingValid() &&
    this.ticketsValid() &&
    this.pageValid()
  );

  ngOnInit(): void {
    this.onboardingService.setCurrentStep('confirm');
  }

  // ============================================================================
  // Helper Methods for Display
  // ============================================================================

  getThemeName(themeId: string): string {
    const themes = this.referenceData.experienceThemes();
    const theme = themes.find(t => t._id === themeId || t.name === themeId);
    return theme?.name || themeId;
  }

  getTopicNames(topicIds: Array<{ theme: string; topic: string }>): string {
    const topics = this.referenceData.experienceTopics();
    return topicIds.map(t => {
      const topic = topics.find(tp => tp._id === t.topic || tp.name === t.topic);
      return topic?.name || t.topic;
    }).join(', ');
  }

  getAudienceNames(audienceIds: string[]): string {
    const audiences = this.referenceData.targetAudiences();
    return audienceIds.map(id => {
      const audience = audiences.find(a => a._id === id || a.name === id);
      return audience?.name || id;
    }).join(', ');
  }

  getLanguageName(langId: string): string {
    const languages = this.referenceData.languages();
    const lang = languages.find(l => l._id === langId || l.name === langId);
    return lang?.name || langId;
  }

  getTimezoneLabel(): string {
    const tz = this.timeZone();
    const timezones: Record<string, string> = {
      'Asia/Kuala_Lumpur': 'Malaysia (GMT+8)',
      'Asia/Singapore': 'Singapore (GMT+8)',
      'Asia/Jakarta': 'Indonesia (GMT+7)',
      'Asia/Bangkok': 'Thailand (GMT+7)',
      'Asia/Manila': 'Philippines (GMT+8)',
      'Asia/Tokyo': 'Japan (GMT+9)',
      'Australia/Sydney': 'Australia (GMT+11)',
      'Europe/London': 'UK (GMT+0)',
      'America/New_York': 'US Eastern (GMT-5)',
      'America/Los_Angeles': 'US Pacific (GMT-8)',
    };
    return tz ? timezones[tz] || tz : 'Not set';
  }

  getDurationText(): string {
    const hours = this.durationHours();
    const minutes = this.durationMinutes();
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ') || 'Not set';
  }

  getLocationText(): string {
    const loc = this.location();
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    return loc.address || loc.formatted_address || '';
  }

  getExperienceTypeIcon(): string {
    const type = this.experienceType();
    switch (type) {
      case 'Physical': return 'location';
      case 'Virtual': return 'video';
      case 'Hybrid': return 'hybrid';
      default: return 'location';
    }
  }

  getFeePaidByText(): string {
    return this.feePaidBy() === 'hub' ? 'Hub (absorbed)' : 'Learner (pass-through)';
  }

  getTicketSummary(): string {
    const ticketList = this.tickets();
    if (ticketList.length === 0) return 'No tickets';
    const paidCount = ticketList.filter((t: { ticketType: string }) => t.ticketType === 'Paid').length;
    const freeCount = ticketList.filter((t: { ticketType: string }) => t.ticketType === 'Free').length;
    const parts: string[] = [];
    if (paidCount > 0) parts.push(`${paidCount} paid`);
    if (freeCount > 0) parts.push(`${freeCount} free`);
    return parts.join(', ');
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  editStep(step: string): void {
    const id = this.onboardingService.experienceId();
    if (id) {
      this.router.navigate(['/onboarding/experience/platform', id, step]);
    } else {
      this.router.navigate(['/onboarding/experience/platform', step]);
    }
  }

  // ============================================================================
  // Share Dialog
  // ============================================================================

  openShareDialog(): void {
    const slugValue = this.slug();
    this.shareUrl.set(`${environment.webUrl}/experience/${slugValue}`);
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

  async saveDraft(): Promise<void> {
    const result = await this.onboardingService.saveDraft();
    if (result) {
      this.navigateBack();
    }
  }

  async publish(): Promise<void> {
    if (!this.canPublish()) {
      console.warn('Cannot publish: validation failed');
      return;
    }

    const result = await this.onboardingService.publish();
    if (result) {
      this.openShareDialog();
    }
  }

  goToExperiences(): void {
    this.navigateBack();
  }

  private navigateBack(): void {
    const returnUrl = this.onboardingService.returnUrl();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/hub/services/experiences']);
    }
  }
}

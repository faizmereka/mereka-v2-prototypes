import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IconComponent } from '@mereka/ui';
import { HubOnboardingService, UploadService, ReferenceDataService } from '../../services';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { environment } from '../../../../../environments/environment';

interface ValidationError {
  step: string;
  field: string;
  message: string;
}

@Component({
  selector: 'app-hub-confirm',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './hub-confirm.component.html',
})
export class HubConfirmComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly uploadService = inject(UploadService);
  private readonly authState = inject(AuthStateService);
  readonly onboarding = inject(HubOnboardingService);
  readonly referenceData = inject(ReferenceDataService);

  // UI State
  isSaving = signal(false);
  isPublishing = signal(false);
  error = signal('');
  validationErrors = signal<ValidationError[]>([]);
  activeTab = signal<'profile' | 'portfolio' | 'gallery'>('profile');

  // ============================================================================
  // Computed Values from Forms
  // ============================================================================

  profileData = computed(() => this.onboarding.profileForm.value);
  aboutData = computed(() => this.onboarding.aboutForm.value);
  detailsData = computed(() => this.onboarding.detailsForm.value);

  businessName = computed(() => this.profileData().agencyName || 'Business Name');
  businessLogo = computed(() => this.profileData().agencyLogo || '');
  coverImage = computed(() => this.profileData().coverImage || '');

  locationString = computed(() => {
    const loc = this.profileData().location;
    if (!loc) return '';
    return [loc.city, loc.country].filter(Boolean).join(', ');
  });

  fullLocationString = computed(() => {
    const loc = this.profileData().location;
    if (!loc) return '';
    return [loc.address, loc.city, loc.state, loc.country, loc.postcode].filter(Boolean).join(', ');
  });

  description = computed(() => this.aboutData().description || '');

  focusAreaLabel = computed(() => {
    const areaId = this.aboutData().focusArea || '';
    return this.referenceData.getFocusAreaName(areaId);
  });

  experienceTypes = computed(() => {
    const ids = this.aboutData().experienceTypes || [];
    return this.referenceData.getExperienceTypeNames(ids);
  });
  tags = computed(() => this.aboutData().tags || []);
  hasExperiences = computed(() => this.experienceTypes().length > 0);
  hasTags = computed(() => this.tags().length > 0);

  employment = computed(() => this.onboarding.employmentArray.value || []);
  education = computed(() => this.onboarding.educationArray.value || []);
  galleryImages = computed(() => this.detailsData().gallery || []);

  // Social Links
  socialLinks = computed(() => this.profileData().socialLinks || {});
  hasSocialLinks = computed(() => {
    const links = this.socialLinks();
    return Object.values(links).some((v) => typeof v === 'string' && v.trim() !== '');
  });

  // Operating Hours
  operatingHours = computed(() => this.aboutData().operatingHours || {});
  hasOperatingHours = computed(() => {
    const hours = this.operatingHours();
    return Object.values(hours).some((day: any) => day && !day.isClosed);
  });

  getActiveDays(): { day: string; hours: { open: string; close: string; }; }[] {
    const hours = this.operatingHours();
    const dayLabels: Record<string, string> = {
      sunday: 'Sunday',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
    };

    return Object.entries(hours)
      .filter(([, value]: [string, any]) => value && !value.isClosed)
      .map(([key, value]: [string, any]) => ({
        day: dayLabels[key] || key,
        hours: { open: value.open || '09:00', close: value.close || '18:00' },
      }));
  }

  mapUrl = computed((): SafeResourceUrl | null => {
    const loc = this.profileData().location;
    let url = '';
    if (loc?.lat && loc?.lng) {
      url = `https://www.google.com/maps/embed/v1/place?key=${environment.google.maps.apiKey}&q=${loc.lat},${loc.lng}&zoom=14`;
    } else if (this.fullLocationString()) {
      url = `https://www.google.com/maps/embed/v1/place?key=${environment.google.maps.apiKey}&q=${encodeURIComponent(this.fullLocationString())}&zoom=14`;
    }
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async ngOnInit(): Promise<void> {
    // Load reference data for displaying names
    this.referenceData.loadAll();

    // Load data if not already initialized
    if (!this.onboarding.isInitialized()) {
      const redirect = await this.onboarding.loadData();

      if (redirect === 'form') {
        this.router.navigate(['/onboarding/hub/form']);
        return;
      }

      if (redirect === 'pricing') {
        this.router.navigate(['/onboarding/hub/pricing']);
        return;
      }
    }
  }

  // ============================================================================
  // Tab Navigation
  // ============================================================================

  setActiveTab(tab: 'profile' | 'portfolio' | 'gallery'): void {
    this.activeTab.set(tab);
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/onboarding/hub/details']);
  }

  goToStep(step: string): void {
    this.router.navigate(['/onboarding/hub', step]);
  }

  // ============================================================================
  // Validation
  // ============================================================================

  validateAllForms(): boolean {
    const errors: ValidationError[] = [];

    // Validate Profile Form (Step 1)
    this.onboarding.markFormTouched(this.onboarding.profileForm);
    if (!this.onboarding.profileForm.valid) {
      const controls = this.onboarding.profileForm.controls;
      Object.keys(controls).forEach((key) => {
        const control = controls[key];
        if (control.invalid) {
          errors.push({
            step: 'profile',
            field: key,
            message: this.onboarding.getErrorMessage(this.onboarding.profileForm, key),
          });
        }
      });
    }

    // Validate About Form (Step 2)
    this.onboarding.markFormTouched(this.onboarding.aboutForm);
    if (!this.onboarding.aboutForm.valid) {
      const controls = this.onboarding.aboutForm.controls;
      Object.keys(controls).forEach((key) => {
        const control = controls[key];
        if (control.invalid) {
          errors.push({
            step: 'about',
            field: key,
            message: this.onboarding.getErrorMessage(this.onboarding.aboutForm, key),
          });
        }
      });
    }

    // Validate Details Form (Step 3)
    this.onboarding.markFormTouched(this.onboarding.detailsForm);
    if (!this.onboarding.detailsForm.valid) {
      const controls = this.onboarding.detailsForm.controls;
      Object.keys(controls).forEach((key) => {
        const control = controls[key];
        if (control.invalid) {
          errors.push({
            step: 'details',
            field: key,
            message: this.onboarding.getErrorMessage(this.onboarding.detailsForm, key),
          });
        }
      });
    }

    this.validationErrors.set(errors);
    return errors.length === 0;
  }

  // ============================================================================
  // Publish
  // ============================================================================

  async onPublish(): Promise<void> {
    this.error.set('');
    this.validationErrors.set([]);

    // Validate all forms
    if (!this.validateAllForms()) {
      this.error.set('Please fix the validation errors before publishing.');
      return;
    }

    this.isPublishing.set(true);

    try {
      // Upload images first
      await this.uploadImages();

      // Save all data
      await this.onboarding.save({ step: 5 });

      // Publish hub for approval
      const publishResult = await this.onboarding.publish();

      if (!publishResult.success) {
        if (publishResult.missingFields && publishResult.missingFields.length > 0) {
          this.error.set(`Missing required fields: ${publishResult.missingFields.join(', ')}`);
        } else {
          this.error.set('Failed to publish hub. Please try again.');
        }
        return;
      }

      // Refresh auth state to update hubs list
      await this.authState.refresh();

      // Navigate to hub dashboard after successful publish
      this.router.navigate(['/hub'], {
        queryParams: { published: 'true' },
      });
    } catch (err) {
      console.error('Error publishing:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to publish. Please try again.');
    } finally {
      this.isPublishing.set(false);
    }
  }

  private async uploadImages(): Promise<void> {
    const slug = this.onboarding.profileForm.get('slug')?.value;

    // Upload logo if base64
    const logo = this.onboarding.profileForm.get('agencyLogo')?.value;
    if (logo && logo.startsWith('data:')) {
      const logoUrl = await this.uploadService.uploadBase64(logo, `hubs/${slug}/logo`);
      this.onboarding.profileForm.patchValue({ agencyLogo: logoUrl });
    }

    // Upload cover if base64
    const cover = this.onboarding.profileForm.get('coverImage')?.value;
    if (cover && cover.startsWith('data:')) {
      const coverResult = await this.uploadService.uploadBase64(cover, `hubs/${slug}/cover`);
      if (coverResult.success && coverResult.url) {
        this.onboarding.profileForm.patchValue({ coverImage: coverResult.url });
      }
    }

    // Upload gallery images if base64
    const gallery = this.onboarding.detailsForm.get('gallery')?.value || [];
    const uploadedGallery: string[] = [];
    for (let i = 0; i < gallery.length; i++) {
      const img = gallery[i];
      if (img.startsWith('data:')) {
        const result = await this.uploadService.uploadBase64(img, `hubs/${slug}/gallery-${i}`);
        if (result.success && result.url) {
          uploadedGallery.push(result.url);
        }
      } else {
        uploadedGallery.push(img);
      }
    }
    this.onboarding.detailsForm.patchValue({ gallery: uploadedGallery });
  }
}

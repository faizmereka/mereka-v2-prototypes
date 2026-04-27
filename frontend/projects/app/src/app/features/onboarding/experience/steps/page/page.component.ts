import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiCollapsibleComponent } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import { UploadService, type UploadError } from '../../../services/upload.service';

interface GalleryPhoto {
  id: string;
  name: string;
  preview: string;
  url?: string;
}

@Component({
  selector: 'app-experience-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiCollapsibleComponent],
  templateUrl: './page.component.html',
})
export class ExperiencePageComponent implements OnInit {
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly uploadService = inject(UploadService);

  // Form from service
  readonly form: FormGroup = this.onboardingService.pageForm;

  // Local preview state (for file uploads before they're persisted)
  readonly coverPhotoPreview = signal('');
  readonly galleryPhotosLocal = signal<GalleryPhoto[]>([]);

  // Upload state
  readonly uploadingCover = signal(false);
  readonly uploadingGallery = signal(false);
  readonly uploadError = signal<UploadError | null>(null);

  // Computed values from form
  readonly description = computed(() => this.form.get('experienceDescription')?.value || '');
  readonly coverPhoto = computed(() => this.form.get('coverPhoto')?.value || '');
  readonly gallery = computed(() => this.form.get('gallery')?.value as string[] || []);
  readonly videoUrl = computed(() => this.form.get('video')?.value || '');

  // For ngModel binding
  descriptionValue = '';

  ngOnInit(): void {
    // Set current step
    this.onboardingService.setCurrentStep('page');

    // Initialize local values from form
    this.descriptionValue = this.description();

    // Initialize cover photo preview if exists
    const cover = this.coverPhoto();
    if (cover) {
      this.coverPhotoPreview.set(cover);
    }

    // Initialize gallery photos
    const galleryUrls = this.gallery();
    if (galleryUrls.length > 0) {
      this.galleryPhotosLocal.set(
        galleryUrls.map((url, i) => ({
          id: `existing-${i}`,
          name: `Photo ${i + 1}`,
          preview: url,
          url,
        }))
      );
    }
  }

  // ============================================================================
  // Description
  // ============================================================================

  onDescriptionChange(value: string): void {
    this.descriptionValue = value;
    this.form.patchValue({ experienceDescription: value });
  }

  // ============================================================================
  // Cover Photo
  // ============================================================================

  async onCoverPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    this.uploadingCover.set(true);
    this.uploadError.set(null);

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      this.coverPhotoPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const hubId = this.onboardingService.hubId();
      const experienceId = this.onboardingService.experienceId() || 'new';
      const uploadPath = `experiences/${hubId}/${experienceId}/cover`;

      const result = await this.uploadService.uploadFile(file, uploadPath);
      if (result.success && result.url) {
        this.form.patchValue({ coverPhoto: result.url });
        this.coverPhotoPreview.set(result.url);
      } else {
        this.uploadError.set(result.error || { code: 'UPLOAD_FAILED', message: 'Failed to upload cover photo' });
        this.coverPhotoPreview.set('');
      }
    } catch (error) {
      this.uploadError.set({ code: 'UPLOAD_FAILED', message: 'Failed to upload cover photo' });
      this.coverPhotoPreview.set('');
    } finally {
      this.uploadingCover.set(false);
      // Reset input to allow same file selection
      input.value = '';
    }
  }

  removeCoverPhoto(): void {
    this.coverPhotoPreview.set('');
    this.form.patchValue({ coverPhoto: '' });
  }

  // ============================================================================
  // Gallery Photos
  // ============================================================================

  async onGalleryPhotosSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const current = this.galleryPhotosLocal();
    const availableSlots = 10 - current.length;

    if (availableSlots <= 0) return;

    const filesToUpload = files.slice(0, availableSlots);
    this.uploadingGallery.set(true);
    this.uploadError.set(null);

    const hubId = this.onboardingService.hubId();
    const experienceId = this.onboardingService.experienceId() || 'new';
    const uploadPath = `experiences/${hubId}/${experienceId}/gallery`;

    try {
      for (const file of filesToUpload) {
        const result = await this.uploadService.uploadFile(file, uploadPath);
        if (result.success && result.url) {
          const newPhoto: GalleryPhoto = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            preview: result.url,
            url: result.url,
          };
          this.galleryPhotosLocal.update(photos => [...photos, newPhoto]);
        } else {
          // Continue with other files even if one fails
          console.error('Failed to upload gallery photo:', result.error);
        }
      }
      this.updateGalleryForm();
    } catch (error) {
      this.uploadError.set({ code: 'UPLOAD_FAILED', message: 'Failed to upload some gallery photos' });
    } finally {
      this.uploadingGallery.set(false);
      // Reset input to allow same file selection
      input.value = '';
    }
  }

  removeGalleryPhoto(photoId: string): void {
    const current = this.galleryPhotosLocal();
    this.galleryPhotosLocal.set(current.filter(p => p.id !== photoId));
    this.updateGalleryForm();
  }

  private updateGalleryForm(): void {
    const urls = this.galleryPhotosLocal().map(p => p.url || p.preview);
    this.form.patchValue({ gallery: urls });
  }

  // ============================================================================
  // Video
  // ============================================================================

  onVideoUrlChange(value: string): void {
    this.form.patchValue({ video: value });
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  clearError(): void {
    this.uploadError.set(null);
  }
}

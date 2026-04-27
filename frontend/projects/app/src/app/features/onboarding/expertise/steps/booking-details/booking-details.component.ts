import { Component, inject, signal, computed, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { 
  UiCollapsibleComponent, 
  UiInputComponent, 
  UiTextareaComponent, 
  UiLocationFormComponent, 
  UiCustomQuestionsComponent,
  type LocationFormData,
  type CustomQuestion as UiCustomQuestion
} from '@mereka/ui';
import { ExpertiseOnboardingService, type CustomQuestion, type ExpertiseLocation } from '../../services/expertise-onboarding.service';
import { UploadService, type UploadError } from '../../../services/upload.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-expertise-booking-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UiCollapsibleComponent,
    UiInputComponent,
    UiTextareaComponent,
    UiLocationFormComponent,
    UiCustomQuestionsComponent,
  ],
  templateUrl: './booking-details.component.html',
})
export class ExpertiseBookingDetailsComponent implements AfterViewInit {
  private readonly onboardingService = inject(ExpertiseOnboardingService);
  private readonly uploadService = inject(UploadService);

  @ViewChild('customQuestionsComponent') customQuestionsComponent?: UiCustomQuestionsComponent;

  // Expose forms from service
  readonly bookingForm = this.onboardingService.bookingForm;
  readonly pageForm = this.onboardingService.pageForm;
  readonly pricingForm = this.onboardingService.pricingForm;

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google?.maps?.apiKey || '';

  // Upload state
  readonly uploading = this.uploadService.uploading;
  readonly uploadError = signal<UploadError | null>(null);
  readonly uploadingCover = signal(false);
  readonly uploadingGallery = signal(false);

  // Link mode options
  readonly linkModeOptions = [
    { value: 'send', label: 'Send link to learner', description: 'You will send the meeting link after booking' },
    { value: 'input', label: 'Use fixed meeting link', description: 'Use the same meeting link for all sessions' },
  ];

  // =============================================================================
  // Location
  // =============================================================================

  // Check if any ticket has physical or hybrid mode
  readonly hasPhysicalPackages = computed(() => {
    const tickets = this.pricingForm.get('tickets')?.value || [];
    return tickets.some((t: { expertiseMode?: string }) => 
      t.expertiseMode === 'physical' || t.expertiseMode === 'hybrid'
    );
  });

  // Check if any ticket has online or hybrid mode  
  readonly hasOnlinePackages = computed(() => {
    const tickets = this.pricingForm.get('tickets')?.value || [];
    return tickets.length === 0 || tickets.some((t: { expertiseMode?: string }) => 
      !t.expertiseMode || t.expertiseMode === 'online' || t.expertiseMode === 'hybrid'
    );
  });

  get currentLocation(): LocationFormData | null {
    const loc = this.bookingForm.get('location')?.value as ExpertiseLocation | null;
    if (!loc) return null;
    return {
      locationType: loc.locationType as LocationFormData['locationType'],
      venueName: loc.venueName,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      lat: loc.lat,
      lng: loc.lng,
    };
  }

  get hubName(): string {
    return this.onboardingService.hubName || '';
  }

  get hubLocation(): LocationFormData | null {
    const loc = this.onboardingService.hubLocation;
    if (!loc) return null;
    return {
      locationType: loc.locationType as LocationFormData['locationType'],
      address: loc.address,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      lat: loc.lat,
      lng: loc.lng,
    };
  }

  onLocationChange(location: LocationFormData): void {
    const expertiseLocation: ExpertiseLocation = {
      locationType: location.locationType,
      venueName: location.venueName,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      lat: location.lat,
      lng: location.lng,
    };
    this.bookingForm.patchValue({ location: expertiseLocation });
  }

  // =============================================================================
  // Custom Questions
  // =============================================================================

  get customQuestionsData(): { isQuestionMandatory: boolean; questionArray: CustomQuestion[] } {
    return this.pageForm.get('customQuestions')?.value || { isQuestionMandatory: false, questionArray: [] };
  }

  // Gallery images
  get gallery(): string[] {
    return this.pageForm.get('gallery')?.value || [];
  }

  ngAfterViewInit(): void {
    // Initialize custom questions component with existing data
    setTimeout(() => {
      if (this.customQuestionsComponent) {
        const data = this.customQuestionsData;
        const uiQuestions = this.mapToUiQuestions(data.questionArray);
        this.customQuestionsComponent.setQuestions(uiQuestions);
        this.customQuestionsComponent.setMandatory(data.isQuestionMandatory);
      }
    });
  }

  // Map service questions to UI component format
  private mapToUiQuestions(questions: CustomQuestion[]): UiCustomQuestion[] {
    return questions.map((q, index) => ({
      id: `q_${index}_${Date.now()}`,
      questionLabel: q.questionLabel,
      questionType: this.mapQuestionType(q.questionType),
      options: this.getOptionsFromQuestion(q),
      isEditing: false,
    }));
  }

  private mapQuestionType(type: string): UiCustomQuestion['questionType'] {
    switch (type) {
      case 'text':
        return 'short_answer';
      case 'dropdown':
        return 'dropdown';
      case 'checkbox':
        return 'checkbox';
      case 'multiple_choice':
        return 'multiple_choice';
      default:
        return 'short_answer';
    }
  }

  private getOptionsFromQuestion(question: CustomQuestion): string[] {
    switch (question.questionType) {
      case 'dropdown':
        return question.dropDown || [];
      case 'checkbox':
        return question.checkBox || [];
      case 'multiple_choice':
        return question.multipleChoices || [];
      default:
        return [];
    }
  }

  // Map UI component questions back to service format
  private mapToServiceQuestions(uiQuestions: UiCustomQuestion[]): CustomQuestion[] {
    return uiQuestions.map(q => {
      const serviceQuestion: CustomQuestion = {
        questionLabel: q.questionLabel,
        questionType: this.mapServiceQuestionType(q.questionType),
        saveStatus: true, // Mark as saved since it came from UI component
      };

      // Add options to the appropriate field
      if (q.options && q.options.length > 0) {
        switch (q.questionType) {
          case 'dropdown':
            serviceQuestion.dropDown = q.options;
            break;
          case 'checkbox':
            serviceQuestion.checkBox = q.options;
            break;
          case 'multiple_choice':
            serviceQuestion.multipleChoices = q.options;
            break;
        }
      }

      return serviceQuestion;
    });
  }

  private mapServiceQuestionType(type: UiCustomQuestion['questionType']): CustomQuestion['questionType'] {
    switch (type) {
      case 'short_answer':
      case 'paragraph':
        return 'text';
      case 'dropdown':
        return 'dropdown';
      case 'checkbox':
        return 'checkbox';
      case 'multiple_choice':
        return 'multiple_choice';
      default:
        return 'text';
    }
  }

  onQuestionsChange(uiQuestions: UiCustomQuestion[]): void {
    const serviceQuestions = this.mapToServiceQuestions(uiQuestions);
    this.pageForm.patchValue({
      customQuestions: {
        ...this.customQuestionsData,
        questionArray: serviceQuestions,
      },
    });
  }

  onMandatoryChange(isMandatory: boolean): void {
    this.pageForm.patchValue({
      customQuestions: {
        ...this.customQuestionsData,
        isQuestionMandatory: isMandatory,
      },
    });
  }

  // =============================================================================
  // Cover Photo Methods
  // =============================================================================

  onCoverPhotoChange(url: string): void {
    this.pageForm.patchValue({ coverPhoto: url });
    this.uploadError.set(null);
  }

  async onCoverFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingCover.set(true);
    this.uploadError.set(null);

    const hubId = this.onboardingService.hubId;
    const path = `expertises/${hubId}/covers`;

    const result = await this.uploadService.uploadFile(file, path, {
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (result.success && result.url) {
      this.onCoverPhotoChange(result.url);
    } else if (result.error) {
      this.uploadError.set(result.error);
    }

    this.uploadingCover.set(false);
    // Reset file input
    input.value = '';
  }

  // =============================================================================
  // Gallery Methods
  // =============================================================================

  onGalleryImageAdd(url: string): void {
    const current = [...this.gallery];
    current.push(url);
    this.pageForm.patchValue({ gallery: current });
    this.uploadError.set(null);
  }

  async onGalleryFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingGallery.set(true);
    this.uploadError.set(null);

    const hubId = this.onboardingService.hubId;
    const path = `expertises/${hubId}/gallery`;

    const result = await this.uploadService.uploadFile(file, path, {
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (result.success && result.url) {
      this.onGalleryImageAdd(result.url);
    } else if (result.error) {
      this.uploadError.set(result.error);
    }

    this.uploadingGallery.set(false);
    // Reset file input
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    const current = [...this.gallery];
    current.splice(index, 1);
    this.pageForm.patchValue({ gallery: current });
  }
}

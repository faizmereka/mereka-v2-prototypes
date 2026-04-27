import { Component, OnInit, ViewChild, ElementRef, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent, UiCollapsibleComponent } from '@mereka/ui';
import { HubOnboardingService, UploadService, type EmploymentItem, type EducationItem, type PortfolioItem } from '../../services';

@Component({
  selector: 'app-hub-details',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, UiCollapsibleComponent],
  templateUrl: './hub-details.component.html',
})
export class HubDetailsComponent implements OnInit {
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;

  private readonly router = inject(Router);
  private readonly uploadService = inject(UploadService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly onboarding = inject(HubOnboardingService);

  // Section collapse states
  sections = signal<Record<string, boolean>>({
    introVideo: true,
    gallery: true,
    projects: true,
    experience: true,
    education: true,
  });

  // UI State
  isSaving = signal(false);

  // Employment form modal state
  showEmploymentForm = signal(false);
  editingEmploymentIndex = signal<number | null>(null);
  newEmploymentTitle = signal('');
  newEmploymentCompany = signal('');
  newEmploymentDuration = signal('');
  newEmploymentDescription = signal('');

  // Education form modal state
  showEducationForm = signal(false);
  editingEducationIndex = signal<number | null>(null);
  newEducationDegree = signal('');
  newEducationInstitution = signal('');
  newEducationYear = signal('');

  // Portfolio/Projects form modal state
  showPortfolioForm = signal(false);
  editingPortfolioIndex = signal<number | null>(null);
  newPortfolioTitle = signal('');
  newPortfolioDescription = signal('');
  newPortfolioYear = signal('');
  newPortfolioImages = signal<string[]>([]);

  // Form shortcut
  get detailsForm(): FormGroup {
    return this.onboarding.detailsForm;
  }

  get employmentArray(): FormArray {
    return this.onboarding.employmentArray;
  }

  get educationArray(): FormArray {
    return this.onboarding.educationArray;
  }

  get portfolioArray(): FormArray {
    return this.onboarding.portfolioArray;
  }

  async ngOnInit(): Promise<void> {
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
  // Section Toggle
  // ============================================================================

  toggleSection(sectionId: string): void {
    this.sections.update((sections) => ({
      ...sections,
      [sectionId]: !sections[sectionId],
    }));
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.sections()[sectionId] ?? true;
  }

  // ============================================================================
  // Gallery
  // ============================================================================

  get galleryImages(): string[] {
    return this.detailsForm.get('gallery')?.value || [];
  }

  triggerGalleryUpload(): void {
    this.galleryInput.nativeElement.click();
  }

  onGalleryImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const result = e.target?.result as string;
          const current = this.galleryImages;
          this.detailsForm.patchValue({ gallery: [...current, result] });
          this.cdr.detectChanges(); // Trigger change detection
        };
        reader.readAsDataURL(file);
      });
    }
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    const current = this.galleryImages;
    this.detailsForm.patchValue({ gallery: current.filter((_, i) => i !== index) });
  }

  get autoPopulateImages(): boolean {
    return this.detailsForm.get('autoPopulateImages')?.value || false;
  }

  onAutoPopulateChange(value: boolean): void {
    this.detailsForm.patchValue({ autoPopulateImages: value });
  }

  // ============================================================================
  // Employment (Scale plan only)
  // ============================================================================

  openEmploymentForm(): void {
    this.showEmploymentForm.set(true);
    this.editingEmploymentIndex.set(null);
    this.newEmploymentTitle.set('');
    this.newEmploymentCompany.set('');
    this.newEmploymentDuration.set('');
    this.newEmploymentDescription.set('');
  }

  editEmployment(index: number): void {
    const employment = this.employmentArray.at(index)?.value;
    if (!employment) return;

    this.showEmploymentForm.set(true);
    this.editingEmploymentIndex.set(index);
    this.newEmploymentTitle.set(employment.title || '');
    this.newEmploymentCompany.set(employment.company || '');
    this.newEmploymentDuration.set(employment.duration || '');
    this.newEmploymentDescription.set(employment.description || '');
  }

  saveEmployment(): void {
    const title = this.newEmploymentTitle().trim();
    const company = this.newEmploymentCompany().trim();
    if (!title || !company) return;

    const data: EmploymentItem = {
      title,
      company,
      duration: this.newEmploymentDuration().trim(),
      description: this.newEmploymentDescription().trim(),
    };

    const editIndex = this.editingEmploymentIndex();
    if (editIndex !== null) {
      this.employmentArray.at(editIndex).patchValue(data);
    } else {
      this.onboarding.addEmployment(data);
    }

    this.closeEmploymentForm();
  }

  closeEmploymentForm(): void {
    this.showEmploymentForm.set(false);
    this.editingEmploymentIndex.set(null);
    this.newEmploymentTitle.set('');
    this.newEmploymentCompany.set('');
    this.newEmploymentDuration.set('');
    this.newEmploymentDescription.set('');
  }

  removeEmployment(index: number): void {
    this.onboarding.removeEmployment(index);
  }

  // ============================================================================
  // Education (Scale plan only)
  // ============================================================================

  openEducationForm(): void {
    this.showEducationForm.set(true);
    this.editingEducationIndex.set(null);
    this.newEducationDegree.set('');
    this.newEducationInstitution.set('');
    this.newEducationYear.set('');
  }

  editEducation(index: number): void {
    const education = this.educationArray.at(index)?.value;
    if (!education) return;

    this.showEducationForm.set(true);
    this.editingEducationIndex.set(index);
    this.newEducationDegree.set(education.degree || '');
    this.newEducationInstitution.set(education.institution || '');
    this.newEducationYear.set(education.year || '');
  }

  saveEducation(): void {
    const degree = this.newEducationDegree().trim();
    const institution = this.newEducationInstitution().trim();
    const year = this.newEducationYear().trim();
    if (!degree || !institution) return;

    const data: EducationItem = {
      degree,
      institution,
      year,
    };

    const editIndex = this.editingEducationIndex();
    if (editIndex !== null) {
      this.educationArray.at(editIndex).patchValue(data);
    } else {
      this.onboarding.addEducation(data);
    }

    this.closeEducationForm();
  }

  closeEducationForm(): void {
    this.showEducationForm.set(false);
    this.editingEducationIndex.set(null);
    this.newEducationDegree.set('');
    this.newEducationInstitution.set('');
    this.newEducationYear.set('');
  }

  removeEducation(index: number): void {
    this.onboarding.removeEducation(index);
  }

  // ============================================================================
  // Portfolio/Projects
  // ============================================================================

  openPortfolioForm(): void {
    this.showPortfolioForm.set(true);
    this.editingPortfolioIndex.set(null);
    this.newPortfolioTitle.set('');
    this.newPortfolioDescription.set('');
    this.newPortfolioYear.set('');
    this.newPortfolioImages.set([]);
  }

  editPortfolio(index: number): void {
    const portfolio = this.portfolioArray.at(index)?.value;
    if (!portfolio) return;

    this.showPortfolioForm.set(true);
    this.editingPortfolioIndex.set(index);
    this.newPortfolioTitle.set(portfolio.title || '');
    this.newPortfolioDescription.set(portfolio.description || '');
    this.newPortfolioYear.set(portfolio.year || '');
    this.newPortfolioImages.set(portfolio.images || []);
  }

  savePortfolio(): void {
    const title = this.newPortfolioTitle().trim();
    if (!title) return;

    const data: PortfolioItem = {
      title,
      description: this.newPortfolioDescription().trim(),
      year: this.newPortfolioYear().trim(),
      images: this.newPortfolioImages(),
    };

    const editIndex = this.editingPortfolioIndex();
    if (editIndex !== null) {
      this.portfolioArray.at(editIndex).patchValue(data);
    } else {
      this.onboarding.addPortfolio(data);
    }

    this.closePortfolioForm();
  }

  closePortfolioForm(): void {
    this.showPortfolioForm.set(false);
    this.editingPortfolioIndex.set(null);
    this.newPortfolioTitle.set('');
    this.newPortfolioDescription.set('');
    this.newPortfolioYear.set('');
    this.newPortfolioImages.set([]);
  }

  removePortfolio(index: number): void {
    this.onboarding.removePortfolio(index);
  }

  onPortfolioImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const result = e.target?.result as string;
          const current = this.newPortfolioImages();
          this.newPortfolioImages.set([...current, result]);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      });
    }
    input.value = '';
  }

  removePortfolioImage(index: number): void {
    const current = this.newPortfolioImages();
    this.newPortfolioImages.set(current.filter((_, i) => i !== index));
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/onboarding/hub/about']);
  }

  async saveAndExit(): Promise<void> {
    this.isSaving.set(true);
    try {
      await this.uploadGalleryAndSave();
    } catch (error) {
      console.error('Error saving:', error);
      // Continue to navigate even if save fails
    } finally {
      this.isSaving.set(false);
      // Always navigate to hub dashboard after save attempt
      this.router.navigate(['/hub']);
    }
  }

  onContinue(): void {
    // Validate form before navigating
    if (!this.onboarding.validateStep(3)) {
      return;
    }

    // Just navigate - don't save (save happens on Save and Exit or confirm page)
    this.router.navigate(['/onboarding/hub/confirm']);
  }

  // ============================================================================
  // Save Helper
  // ============================================================================

  private async uploadGalleryAndSave(): Promise<void> {
    const slug = this.onboarding.profileForm.get('slug')?.value;
    const gallery = this.galleryImages;

    // Upload gallery images if base64
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

    this.detailsForm.patchValue({ gallery: uploadedGallery });

    // Save to API
    await this.onboarding.save({ step: 4 });
  }
}

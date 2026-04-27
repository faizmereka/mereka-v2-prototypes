import { Component, OnInit, inject, computed, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import {
  UiCollapsibleComponent,
  UiUploadImageComponent,
  IconComponent,
  DialogService,
} from '@mereka/ui';
import { ExpertOnboardingService } from '../../services';
import type { UploadedFile } from '@mereka/ui';
import {
  PortfolioDialogComponent,
  PortfolioDialogData,
  PortfolioDialogResult,
  EmploymentDialogComponent,
  EmploymentDialogData,
  EmploymentDialogResult,
  EducationDialogComponent,
  EducationDialogData,
  EducationDialogResult,
} from './dialogs';

@Component({
  selector: 'app-expert-background',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiCollapsibleComponent,
    UiUploadImageComponent,
    IconComponent,
  ],
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.scss'],
})
export class ExpertBackgroundComponent implements OnInit {
  readonly onboarding = inject(ExpertOnboardingService);
  private readonly dialogService = inject(DialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Track which portfolio is currently uploading
  readonly uploadingPortfolioIndex = signal<number | null>(null);

  // Form getters
  readonly backgroundForm = computed(() => this.onboarding.backgroundForm);
  readonly portfolioArray = computed(() => this.onboarding.portfolioArray);
  readonly employmentArray = computed(() => this.onboarding.employmentArray);
  readonly educationArray = computed(() => this.onboarding.educationArray);

  // Generate year options (current year to 50 years ago)
  readonly yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear; i >= currentYear - 50; i--) {
      years.push(i);
    }
    return years;
  });

  ngOnInit(): void {
    // Ensure onboarding service is initialized
    if (!this.onboarding.isInitialized()) {
      this.onboarding.initialize();
    }
  }

  // Portfolio management
  getPortfolioFormGroup(index: number): FormGroup {
    return this.portfolioArray().at(index) as FormGroup;
  }

  getPortfolioImages(index: number): string[] {
    return this.getPortfolioFormGroup(index).get('images')?.value || [];
  }

  openPortfolioDialog(index?: number): void {
    const isEdit = index !== undefined;
    const portfolio = isEdit ? this.getPortfolioFormGroup(index).value : undefined;

    const dialogData: PortfolioDialogData = {
      mode: isEdit ? 'edit' : 'add',
      portfolio: portfolio
        ? {
            title: portfolio.title,
            description: portfolio.description,
            year: portfolio.year,
            projectLink: portfolio.projectLink,
            images: portfolio.images || [],
            startDate: portfolio.startDate,
            endDate: portfolio.endDate,
          }
        : undefined,
    };

    const dialogRef = this.dialogService.open<PortfolioDialogComponent, PortfolioDialogData, PortfolioDialogResult>(
      PortfolioDialogComponent,
      {
        data: dialogData,
        width: 'md',
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (isEdit && index !== undefined) {
          this.getPortfolioFormGroup(index).patchValue(result);
        } else {
          this.onboarding.addPortfolio();
          const newIndex = this.portfolioArray().length - 1;
          this.getPortfolioFormGroup(newIndex).patchValue(result);
        }
        this.cdr.detectChanges();
      }
    });
  }

  removePortfolio(index: number): void {
    this.onboarding.removePortfolio(index);
  }

  // Employment management
  getEmploymentFormGroup(index: number): FormGroup {
    return this.employmentArray().at(index) as FormGroup;
  }

  openEmploymentDialog(index?: number): void {
    const isEdit = index !== undefined;
    const employment = isEdit ? this.getEmploymentFormGroup(index).value : undefined;

    const dialogData: EmploymentDialogData = {
      mode: isEdit ? 'edit' : 'add',
      employment: employment
        ? {
            title: employment.title,
            company: employment.company,
            city: employment.city,
            country: employment.country,
            startDate: employment.startDate,
            endDate: employment.endDate,
            isOngoing: employment.isOngoing,
            description: employment.description,
          }
        : undefined,
    };

    const dialogRef = this.dialogService.open<EmploymentDialogComponent, EmploymentDialogData, EmploymentDialogResult>(
      EmploymentDialogComponent,
      {
        data: dialogData,
        width: 'md',
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (isEdit && index !== undefined) {
          this.getEmploymentFormGroup(index).patchValue(result);
        } else {
          this.onboarding.addEmployment();
          const newIndex = this.employmentArray().length - 1;
          this.getEmploymentFormGroup(newIndex).patchValue(result);
        }
        this.cdr.detectChanges();
      }
    });
  }

  removeEmployment(index: number): void {
    this.onboarding.removeEmployment(index);
  }

  // Education management
  getEducationFormGroup(index: number): FormGroup {
    return this.educationArray().at(index) as FormGroup;
  }

  openEducationDialog(index?: number): void {
    const isEdit = index !== undefined;
    const education = isEdit ? this.getEducationFormGroup(index).value : undefined;

    const dialogData: EducationDialogData = {
      mode: isEdit ? 'edit' : 'add',
      education: education
        ? {
            institution: education.institution,
            degree: education.degree,
            fieldOfStudy: education.fieldOfStudy || '',
            startDate: education.startDate,
            endDate: education.endDate,
            description: education.description,
          }
        : undefined,
    };

    const dialogRef = this.dialogService.open<EducationDialogComponent, EducationDialogData, EducationDialogResult>(
      EducationDialogComponent,
      {
        data: dialogData,
        width: 'md',
      }
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (isEdit && index !== undefined) {
          this.getEducationFormGroup(index).patchValue(result);
        } else {
          this.onboarding.addEducation();
          const newIndex = this.educationArray().length - 1;
          this.getEducationFormGroup(newIndex).patchValue(result);
        }
        this.cdr.detectChanges();
      }
    });
  }

  removeEducation(index: number): void {
    this.onboarding.removeEducation(index);
  }

  // Utility methods
  formatEmploymentDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

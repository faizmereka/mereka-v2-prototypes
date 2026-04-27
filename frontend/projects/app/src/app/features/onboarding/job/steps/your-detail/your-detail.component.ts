import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UiRichTextEditorComponent } from '@mereka/ui';
import { CreateJobService } from '../../services/create-job.service';

// Country codes for phone input
const COUNTRY_CODES = [
  { code: '+60', country: 'MY', name: 'Malaysia' },
  { code: '+65', country: 'SG', name: 'Singapore' },
  { code: '+1', country: 'US', name: 'United States' },
  { code: '+44', country: 'UK', name: 'United Kingdom' },
  { code: '+91', country: 'IN', name: 'India' },
  { code: '+61', country: 'AU', name: 'Australia' },
  { code: '+81', country: 'JP', name: 'Japan' },
  { code: '+82', country: 'KR', name: 'South Korea' },
  { code: '+86', country: 'CN', name: 'China' },
  { code: '+62', country: 'ID', name: 'Indonesia' },
  { code: '+66', country: 'TH', name: 'Thailand' },
  { code: '+63', country: 'PH', name: 'Philippines' },
  { code: '+84', country: 'VN', name: 'Vietnam' },
];

@Component({
  selector: 'app-job-your-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiRichTextEditorComponent],
  templateUrl: './your-detail.component.html',
})
export class JobYourDetailComponent implements OnInit, OnDestroy {
  private readonly createJobService = inject(CreateJobService);
  private readonly destroy$ = new Subject<void>();

  // Form from service
  readonly form: FormGroup = this.createJobService.yourDetailForm;

  // Reference data
  readonly countryCodes = COUNTRY_CODES;

  // UI state
  readonly aboutLength = signal(0);
  readonly maxAboutLength = 2000;
  readonly isUploadingLogo = signal(false);
  readonly logoPreview = signal<string | null>(null);

  ngOnInit(): void {
    // Set current step
    this.createJobService.setCurrentStep('your-detail');

    // Track about length
    this.updateAboutLength(this.form.get('aboutOrganization')?.value || '');

    this.form.get('aboutOrganization')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAboutLength(value || '');
      });

    // Initialize logo preview
    const logo = this.form.get('organizationLogo')?.value;
    if (logo) {
      this.logoPreview.set(logo);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateAboutLength(value: string): void {
    // Strip HTML tags for character counting
    const text = value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    this.aboutLength.set(text.length);
  }

  onAboutChange(html: string): void {
    this.form.patchValue({ aboutOrganization: html });
    this.updateAboutLength(html);
  }

  async onLogoSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (5MB limit for logos)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Logo size must be less than 5MB');
      return;
    }

    this.isUploadingLogo.set(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Upload to server and get URL
      // For now, we'll just use the data URL
      // const result = await this.uploadService.uploadLogo(file);
      // this.form.patchValue({ organizationLogo: result.url });
    } finally {
      this.isUploadingLogo.set(false);
      input.value = '';
    }
  }

  removeLogo(): void {
    this.logoPreview.set(null);
    this.form.patchValue({ organizationLogo: '' });
  }
}

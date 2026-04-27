import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UiRichTextEditorComponent } from '@mereka/ui';
import { CreateJobService } from '../../services/create-job.service';
import type { JobAttachment } from '../../models';

@Component({
  selector: 'app-job-requirements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, UiRichTextEditorComponent],
  templateUrl: './requirements.component.html',
})
export class JobRequirementsComponent implements OnInit, OnDestroy {
  private readonly createJobService = inject(CreateJobService);
  private readonly destroy$ = new Subject<void>();

  // Form from service
  readonly form: FormGroup = this.createJobService.requirementsForm;

  // UI state
  readonly descriptionLength = signal(0);
  readonly summaryLength = signal(0);
  readonly maxDescriptionLength = 2000;
  readonly maxSummaryLength = 150;
  readonly isGeneratingAi = signal(false);
  readonly isUploading = signal(false);
  readonly skillInput = signal('');

  // Getters for form data
  get skills(): string[] {
    return this.createJobService.getSkills();
  }

  get attachments(): JobAttachment[] {
    return this.createJobService.getAttachments();
  }

  ngOnInit(): void {
    // Set current step
    this.createJobService.setCurrentStep('requirements');

    // Track description length
    this.updateDescriptionLength(this.form.get('jobDescription')?.value || '');
    this.updateSummaryLength(this.form.get('jobSummary')?.value || '');

    this.form.get('jobDescription')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateDescriptionLength(value || '');
      });

    this.form.get('jobSummary')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateSummaryLength(value || '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateDescriptionLength(value: string): void {
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
    this.descriptionLength.set(text.length);
  }

  onDescriptionChange(html: string): void {
    this.form.patchValue({ jobDescription: html });
    this.updateDescriptionLength(html);
  }

  private updateSummaryLength(value: string): void {
    this.summaryLength.set(value.length);
  }

  onDescriptionInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea.value.length > this.maxDescriptionLength) {
      textarea.value = textarea.value.substring(0, this.maxDescriptionLength);
      this.form.patchValue({ jobDescription: textarea.value });
    }
  }

  onSummaryInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea.value.length > this.maxSummaryLength) {
      textarea.value = textarea.value.substring(0, this.maxSummaryLength);
      this.form.patchValue({ jobSummary: textarea.value });
    }
  }

  async generateAiSummary(): Promise<void> {
    if (this.isGeneratingAi()) return;

    const description = this.form.get('jobDescription')?.value;
    if (!description || description.length < 50) {
      return;
    }

    this.isGeneratingAi.set(true);
    try {
      await this.createJobService.generateAiSummary();
    } finally {
      this.isGeneratingAi.set(false);
    }
  }

  // Skills management
  addSkill(): void {
    const skill = this.skillInput().trim();
    if (skill && this.skills.length < 5 && !this.skills.includes(skill)) {
      this.createJobService.addSkill(skill);
      this.skillInput.set('');
    }
  }

  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addSkill();
    }
  }

  removeSkill(skill: string): void {
    this.createJobService.removeSkill(skill);
  }

  // File upload
  async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 100MB');
      return;
    }

    this.isUploading.set(true);
    try {
      await this.createJobService.uploadAttachment(file);
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  removeAttachment(id: string): void {
    this.createJobService.removeAttachment(id);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getFileIcon(type: string): string {
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('image')) return 'image';
    if (type.includes('word') || type.includes('document')) return 'doc';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'xls';
    return 'file';
  }
}

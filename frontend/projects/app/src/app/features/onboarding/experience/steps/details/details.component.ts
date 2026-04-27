import { Component, OnInit, signal, computed, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiCustomQuestionsComponent, CustomQuestion, UiCollapsibleComponent } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';

@Component({
  selector: 'app-experience-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiCustomQuestionsComponent, UiCollapsibleComponent],
  templateUrl: './details.component.html',
})
export class ExperienceDetailsComponent implements OnInit, AfterViewInit {
  @ViewChild('customQuestionsComponent') customQuestionsComponent!: UiCustomQuestionsComponent;

  private readonly onboardingService = inject(ExperienceOnboardingService);

  // Form from service
  readonly form: FormGroup = this.onboardingService.detailsForm;

  // Local UI state for materials/bring options
  readonly materialsOption = signal<'none' | 'provide'>('none');
  readonly bringOption = signal<'nothing' | 'bring'>('nothing');

  // Input fields
  materialInput = '';
  bringItemInput = '';

  // Local poster preview
  readonly posterPreview = signal<string | null>(null);

  // Computed values from form
  readonly learningOutcomes = computed(() => this.form.get('learnerOutcome')?.value || '');
  readonly instructions = computed(() => this.form.get('instruction')?.value || '');
  readonly materials = computed(() => {
    const value = this.form.get('materialProvided')?.value;
    if (!value) return [];
    // If stored as string, split by newlines/commas
    if (typeof value === 'string') {
      return value.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
    }
    return value as string[];
  });
  readonly bringItems = computed(() => {
    const value = this.form.get('materialNeedToBring')?.value;
    if (!value) return [];
    if (typeof value === 'string') {
      return value.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
    }
    return value as string[];
  });
  readonly poster = computed(() => this.form.get('poster')?.value || '');
  readonly customQuestions = computed(() => this.form.get('customQuestions')?.value?.questionArray || []);
  readonly isQuestionMandatory = computed(() => this.form.get('customQuestions')?.value?.isQuestionMandatory || false);

  ngOnInit(): void {
    // Set current step
    this.onboardingService.setCurrentStep('details');

    // Initialize local state from form
    if (this.materials().length > 0) {
      this.materialsOption.set('provide');
    }
    if (this.bringItems().length > 0) {
      this.bringOption.set('bring');
    }

    // Initialize poster preview
    const posterUrl = this.poster();
    if (posterUrl) {
      this.posterPreview.set(posterUrl);
    }
  }

  ngAfterViewInit(): void {
    // Set custom questions to component after view init
    const questions = this.customQuestions();
    if (questions.length > 0 && this.customQuestionsComponent) {
      setTimeout(() => {
        this.customQuestionsComponent.setQuestions(questions);
        this.customQuestionsComponent.setMandatory(this.isQuestionMandatory());
      });
    }
  }

  // ============================================================================
  // Learning Outcomes
  // ============================================================================

  onLearningOutcomesChange(value: string): void {
    this.form.patchValue({ learnerOutcome: value });
  }

  // ============================================================================
  // Instructions
  // ============================================================================

  onInstructionsChange(value: string): void {
    this.form.patchValue({ instruction: value });
  }

  // ============================================================================
  // Materials
  // ============================================================================

  onMaterialsOptionChange(option: 'none' | 'provide'): void {
    this.materialsOption.set(option);
    if (option === 'none') {
      this.form.patchValue({ materialProvided: '' });
    }
  }

  addMaterial(): void {
    if (this.materialInput.trim()) {
      const current = this.materials();
      const updated = [...current, this.materialInput.trim()];
      this.form.patchValue({ materialProvided: updated.join('\n') });
      this.materialInput = '';
    }
  }

  removeMaterial(material: string): void {
    const current = this.materials();
    const updated = current.filter(m => m !== material);
    this.form.patchValue({ materialProvided: updated.join('\n') });
  }

  // ============================================================================
  // What to Bring
  // ============================================================================

  onBringOptionChange(option: 'nothing' | 'bring'): void {
    this.bringOption.set(option);
    if (option === 'nothing') {
      this.form.patchValue({ materialNeedToBring: '' });
    }
  }

  addBringItem(): void {
    if (this.bringItemInput.trim()) {
      const current = this.bringItems();
      const updated = [...current, this.bringItemInput.trim()];
      this.form.patchValue({ materialNeedToBring: updated.join('\n') });
      this.bringItemInput = '';
    }
  }

  removeBringItem(item: string): void {
    const current = this.bringItems();
    const updated = current.filter(i => i !== item);
    this.form.patchValue({ materialNeedToBring: updated.join('\n') });
  }

  // ============================================================================
  // Poster
  // ============================================================================

  onPosterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.posterPreview.set(result);
        // In real implementation, upload file and get URL
        this.form.patchValue({ poster: result });
      };
      reader.readAsDataURL(file);
    }
  }

  removePoster(): void {
    this.posterPreview.set(null);
    this.form.patchValue({ poster: '' });
  }

  // ============================================================================
  // Custom Questions
  // ============================================================================

  onQuestionsChange(questions: CustomQuestion[]): void {
    const current = this.form.get('customQuestions')?.value || {};
    this.form.patchValue({
      customQuestions: {
        ...current,
        questionArray: questions,
      },
    });
  }

  onMandatoryChange(value: boolean): void {
    const current = this.form.get('customQuestions')?.value || {};
    this.form.patchValue({
      customQuestions: {
        ...current,
        isQuestionMandatory: value,
      },
    });
  }
}

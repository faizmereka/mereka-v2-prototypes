import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  CheckoutQuestionnaire,
  CheckoutQuestion,
} from '../../../core/services/checkout-api.service';

// Re-export for convenience
export type QuestionnaireConfig = CheckoutQuestionnaire;
export type QuestionConfig = CheckoutQuestion;

export interface QuestionnaireAnswer {
  questionLabel: string;
  answer: string | string[];
}

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (questionnaire()?.questionArray?.length) {
      <div class="space-y-6">
        @for (question of questionnaire()!.questionArray; track question.questionLabel; let i = $index) {
          <div class="space-y-2">
            <label class="block text-sm font-medium text-neutral-700">
              {{ question.questionLabel }}
              @if (questionnaire()!.isQuestionMandatory) {
                <span class="text-red-500">*</span>
              }
            </label>

            @switch (question.questionType) {
              @case ('text') {
                <input
                  type="text"
                  [ngModel]="getTextAnswer(question.questionLabel)"
                  (ngModelChange)="updateAnswer(question.questionLabel, $event)"
                  placeholder="Enter your answer"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  [class.border-red-500]="showErrors() && questionnaire()!.isQuestionMandatory && !getTextAnswer(question.questionLabel)"
                />
              }

              @case ('dropdown') {
                <select
                  [ngModel]="getTextAnswer(question.questionLabel)"
                  (ngModelChange)="updateAnswer(question.questionLabel, $event)"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  [class.border-red-500]="showErrors() && questionnaire()!.isQuestionMandatory && !getTextAnswer(question.questionLabel)"
                >
                  <option value="">Select an option</option>
                  @for (opt of question.dropDown || []; track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              }

              @case ('checkbox') {
                <div class="space-y-2">
                  @for (opt of question.checkBox || []; track opt) {
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="isChecked(question.questionLabel, opt)"
                        (change)="toggleCheckbox(question.questionLabel, opt, $event)"
                        class="w-4 h-4 text-primary-600 border-neutral-300 rounded
                               focus:ring-primary-500"
                      />
                      <span class="text-sm text-neutral-700">{{ opt }}</span>
                    </label>
                  }
                </div>
              }

              @case ('multiple_choice') {
                <div class="space-y-2">
                  @for (opt of question.multipleChoices || []; track opt) {
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        [name]="'q_' + i"
                        [value]="opt"
                        [checked]="getTextAnswer(question.questionLabel) === opt"
                        (change)="updateAnswer(question.questionLabel, opt)"
                        class="w-4 h-4 text-primary-600 border-neutral-300
                               focus:ring-primary-500"
                      />
                      <span class="text-sm text-neutral-700">{{ opt }}</span>
                    </label>
                  }
                </div>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class QuestionnaireFormComponent {
  readonly questionnaire = input<QuestionnaireConfig | null>(null);
  readonly showErrors = input<boolean>(false);
  readonly answersChange = output<QuestionnaireAnswer[]>();

  private readonly _answers = signal<Map<string, string | string[]>>(new Map());

  constructor() {
    // Initialize answers when questionnaire changes
    effect(() => {
      const q = this.questionnaire();
      if (q?.questionArray) {
        const newAnswers = new Map<string, string | string[]>();
        for (const question of q.questionArray) {
          if (question.questionType === 'checkbox') {
            newAnswers.set(question.questionLabel, []);
          } else {
            newAnswers.set(question.questionLabel, '');
          }
        }
        this._answers.set(newAnswers);
      }
    }, { allowSignalWrites: true });
  }

  getTextAnswer(questionLabel: string): string {
    const answer = this._answers().get(questionLabel);
    return typeof answer === 'string' ? answer : '';
  }

  getCheckboxAnswers(questionLabel: string): string[] {
    const answer = this._answers().get(questionLabel);
    return Array.isArray(answer) ? answer : [];
  }

  isChecked(questionLabel: string, option: string): boolean {
    const answers = this.getCheckboxAnswers(questionLabel);
    return answers.includes(option);
  }

  updateAnswer(questionLabel: string, value: string): void {
    const answers = new Map(this._answers());
    answers.set(questionLabel, value);
    this._answers.set(answers);
    this.emitAnswers();
  }

  toggleCheckbox(questionLabel: string, option: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentAnswers = this.getCheckboxAnswers(questionLabel);

    let newAnswers: string[];
    if (checked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter((a) => a !== option);
    }

    const answers = new Map(this._answers());
    answers.set(questionLabel, newAnswers);
    this._answers.set(answers);
    this.emitAnswers();
  }

  private emitAnswers(): void {
    const result: QuestionnaireAnswer[] = [];
    this._answers().forEach((answer, questionLabel) => {
      result.push({ questionLabel, answer });
    });
    this.answersChange.emit(result);
  }

  getAnswers(): QuestionnaireAnswer[] {
    const result: QuestionnaireAnswer[] = [];
    this._answers().forEach((answer, questionLabel) => {
      result.push({ questionLabel, answer });
    });
    return result;
  }

  isValid(): boolean {
    const q = this.questionnaire();
    if (!q || !q.isQuestionMandatory) return true;

    for (const question of q.questionArray) {
      const answer = this._answers().get(question.questionLabel);
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        return false;
      }
    }
    return true;
  }
}

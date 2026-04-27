import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

export interface QuestionOption {
  value: string;
}

export interface CustomQuestion {
  id: string;
  questionLabel: string;
  questionType: 'short_answer' | 'paragraph' | 'dropdown' | 'multiple_choice' | 'checkbox';
  options: string[];
  isEditing: boolean;
}

@Component({
  selector: 'ui-custom-questions',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './custom-questions.component.html',
})
export class UiCustomQuestionsComponent {
  readonly maxQuestions = input<number>(10);
  readonly serviceType = input<string>('experience');
  readonly questionsChange = output<CustomQuestion[]>();
  readonly mandatoryChange = output<boolean>();

  readonly questions = signal<CustomQuestion[]>([]);
  readonly isQuestionMandatory = signal(false);
  readonly showAddMenu = signal(false);

  readonly questionTypes = [
    { name: 'short_answer', title: 'Short answer' },
    { name: 'paragraph', title: 'Paragraph' },
    { name: 'dropdown', title: 'Dropdown' },
    { name: 'multiple_choice', title: 'Multiple choice' },
    { name: 'checkbox', title: 'Checkboxes' },
  ] as const;

  readonly hasUnsavedQuestions = computed(() =>
    this.questions().some(q => q.isEditing)
  );

  readonly canAddQuestion = computed(() =>
    this.questions().length < this.maxQuestions() && !this.hasUnsavedQuestions()
  );

  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addQuestion(type: CustomQuestion['questionType']): void {
    const newQuestion: CustomQuestion = {
      id: this.generateId(),
      questionLabel: '',
      questionType: type,
      options: type === 'short_answer' || type === 'paragraph' ? [] : [''],
      isEditing: true,
    };
    this.questions.update(q => [...q, newQuestion]);
    this.showAddMenu.set(false);
  }

  updateQuestionLabel(id: string, label: string): void {
    this.questions.update(questions =>
      questions.map(q => q.id === id ? { ...q, questionLabel: label } : q)
    );
  }

  updateQuestionType(id: string, type: CustomQuestion['questionType']): void {
    this.questions.update(questions =>
      questions.map(q => {
        if (q.id === id) {
          const needsOptions = type !== 'short_answer' && type !== 'paragraph';
          return {
            ...q,
            questionType: type,
            options: needsOptions && q.options.length === 0 ? [''] : (needsOptions ? q.options : [])
          };
        }
        return q;
      })
    );
  }

  addOption(questionId: string): void {
    this.questions.update(questions =>
      questions.map(q => q.id === questionId
        ? { ...q, options: [...q.options, ''] }
        : q
      )
    );
  }

  updateOption(questionId: string, optionIndex: number, value: string): void {
    this.questions.update(questions =>
      questions.map(q => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  }

  deleteOption(questionId: string, optionIndex: number): void {
    this.questions.update(questions =>
      questions.map(q => {
        if (q.id === questionId) {
          if (optionIndex === 0 && q.options.length === 1) {
            return { ...q, options: [''] };
          }
          return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
        }
        return q;
      })
    );
  }

  saveQuestion(id: string): void {
    const question = this.questions().find(q => q.id === id);
    if (question && question.questionLabel.trim()) {
      this.questions.update(questions =>
        questions.map(q => q.id === id ? { ...q, isEditing: false } : q)
      );
      this.emitChanges();
    }
  }

  saveAllQuestions(): void {
    this.questions.update(questions =>
      questions.map(q => q.questionLabel.trim() ? { ...q, isEditing: false } : q)
    );
    this.emitChanges();
  }

  cancelQuestion(id: string): void {
    const question = this.questions().find(q => q.id === id);
    if (question && !question.questionLabel.trim()) {
      this.questions.update(q => q.filter(item => item.id !== id));
    } else {
      this.questions.update(questions =>
        questions.map(q => q.id === id ? { ...q, isEditing: false } : q)
      );
    }
    this.emitChanges();
  }

  cancelAllUnsaved(): void {
    this.questions.update(questions =>
      questions.filter(q => !q.isEditing || q.questionLabel.trim())
        .map(q => ({ ...q, isEditing: false }))
    );
    if (this.questions().length === 0) {
      this.isQuestionMandatory.set(false);
      this.mandatoryChange.emit(false);
    }
    this.emitChanges();
  }

  editQuestion(id: string): void {
    this.questions.update(questions =>
      questions.map(q => q.id === id ? { ...q, isEditing: true } : q)
    );
  }

  removeQuestion(id: string): void {
    this.questions.update(q => q.filter(item => item.id !== id));
    if (this.questions().length === 0) {
      this.isQuestionMandatory.set(false);
      this.mandatoryChange.emit(false);
    }
    this.emitChanges();
  }

  onDrop(event: CdkDragDrop<CustomQuestion[]>): void {
    const questions = [...this.questions()];
    moveItemInArray(questions, event.previousIndex, event.currentIndex);
    this.questions.set(questions);
    this.emitChanges();
  }

  toggleMandatory(value: boolean): void {
    this.isQuestionMandatory.set(value);
    this.mandatoryChange.emit(value);
  }

  private emitChanges(): void {
    this.questionsChange.emit(this.questions().filter(q => !q.isEditing));
  }

  getQuestionTypeTitle(type: string): string {
    return this.questionTypes.find(t => t.name === type)?.title || type;
  }

  isQuestionValid(question: CustomQuestion): boolean {
    if (!question.questionLabel.trim()) return false;
    if (question.questionType === 'short_answer' || question.questionType === 'paragraph') return true;
    return question.options.some(o => o.trim());
  }

  // Initialize with existing questions
  setQuestions(questions: CustomQuestion[]): void {
    this.questions.set(questions.map(q => ({ ...q, isEditing: false })));
  }

  setMandatory(value: boolean): void {
    this.isQuestionMandatory.set(value);
  }
}

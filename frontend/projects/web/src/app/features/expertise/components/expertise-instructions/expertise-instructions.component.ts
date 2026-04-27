import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpertiseService } from '../../services/expertise.service';

export interface InstructionsData {
  materialProvided: string[];
  materialToBring: string[];
  faq: string;
}

@Component({
  selector: 'app-expertise-instructions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-instructions.component.html',
})
export class ExpertiseInstructionsComponent {
  readonly slug = input.required<string>();
  private readonly expertiseService = inject(ExpertiseService);

  readonly instructions = computed<InstructionsData>(() => {
    const exp = this.expertiseService.expertise();
    if (!exp) {
      return { materialProvided: [], materialToBring: [], faq: '' };
    }
    return {
      materialProvided: exp.materialProvided || [],
      materialToBring: exp.materialNeedToBring || [],
      faq: exp.expertiseInstructions || '',
    };
  });

  readonly hasMaterialProvided = computed(
    () => this.instructions().materialProvided.length > 0
  );

  readonly hasMaterialToBring = computed(
    () => this.instructions().materialToBring.length > 0
  );

  readonly hasFaq = computed(() => !!this.instructions().faq);

  readonly hasAnyContent = computed(
    () =>
      this.hasMaterialProvided() || this.hasMaterialToBring() || this.hasFaq()
  );
}

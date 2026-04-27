import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperienceService } from '../../services/experience.service';

export interface ExperienceInstructionsData {
  instruction?: string;
  materialProvided: string[];
  materialNeedToBring: string[];
  posterUrl?: string;
}

@Component({
  selector: 'app-experience-instructions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-instructions.component.html',
})
export class ExperienceInstructionsComponent {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);

  // Computed instructions from service
  readonly instructions = computed<ExperienceInstructionsData>(() => {
    const exp = this.experienceService.experience();
    if (!exp) {
      return {
        instruction: '',
        materialProvided: [],
        materialNeedToBring: [],
        posterUrl: '',
      };
    }

    // Parse materials (they come as strings, convert to arrays)
    const parseList = (str: string | undefined): string[] => {
      if (!str) return [];
      return str
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    };

    return {
      instruction: exp.instruction,
      materialProvided: parseList(exp.materialProvided),
      materialNeedToBring: parseList(exp.materialNeedToBring),
      posterUrl: '', // TODO: Add poster support
    };
  });

  readonly hasData = computed(() => {
    const data = this.instructions();
    return (
      data.instruction ||
      data.materialProvided.length > 0 ||
      data.materialNeedToBring.length > 0
    );
  });
}

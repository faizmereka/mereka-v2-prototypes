import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpertiseService } from '../../services/expertise.service';

export interface ExpertiseAboutData {
  duration: string;
  languages: string[];
  types: string[];
  description: string;
}

@Component({
  selector: 'app-expertise-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-about.component.html',
})
export class ExpertiseAboutComponent {
  readonly slug = input.required<string>();
  private readonly expertiseService = inject(ExpertiseService);

  readonly about = computed<ExpertiseAboutData>(() => {
    const exp = this.expertiseService.expertise();
    if (!exp) {
      return { duration: 'N/A', languages: [], types: [], description: '' };
    }

    // Calculate average duration from tickets (sessionDuration in minutes or hours)
    const durations = exp.ticket
      ?.filter((t) => t.sessionDuration)
      .map((t) => {
        // Convert to minutes for averaging
        if (t.durationUnit === 'hours') {
          return (t.sessionDuration || 0) * 60;
        }
        return t.sessionDuration || 0;
      }) || [];
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      duration: this.expertiseService.formatDuration(avgDuration),
      languages: this.expertiseService.languages(),
      types: exp.tags || [],
      description: exp.expertiseDescription || '',
    };
  });

  readonly languagesText = computed(() => {
    const langs = this.about().languages;
    return langs.length > 0 ? langs.join(', ') : 'N/A';
  });

  readonly hasTypes = computed(() => this.about().types.length > 0);
  readonly hasDescription = computed(() => !!this.about().description);
}

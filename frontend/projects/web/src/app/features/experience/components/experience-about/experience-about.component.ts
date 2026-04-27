import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperienceService } from '../../services/experience.service';

export interface ExperienceAboutData {
  duration: string;
  level: string;
  upToLearners: number;
  languages: string[];
  audienceType: string;
  isMultipleTicketTypes: boolean;
  isKidsFriendly: boolean;
  canPrivateGroup: boolean;
  description: string;
  videoUrl?: string;
}

@Component({
  selector: 'app-experience-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-about.component.html',
})
export class ExperienceAboutComponent {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);

  // Computed about data from service
  readonly about = computed<ExperienceAboutData>(() => {
    const exp = this.experienceService.experience();
    if (!exp) {
      return {
        duration: '',
        level: '',
        upToLearners: 0,
        languages: [],
        audienceType: 'Everyone',
        isMultipleTicketTypes: false,
        isKidsFriendly: false,
        canPrivateGroup: false,
        description: '',
      };
    }

    const languages = [exp.primaryLanguage, ...(exp.secondaryLanguage || [])].filter(
      Boolean
    ) as string[];

    return {
      duration: this.experienceService.formatDuration(exp.experienceDuration),
      level: exp.expertiseLevel || 'Beginner',
      upToLearners: exp.ticket?.reduce((sum, t) => sum + (t.ticketQty || 0), 0) || 0,
      languages,
      audienceType: exp.audienceType,
      isMultipleTicketTypes: (exp.ticket?.length || 0) > 1,
      isKidsFriendly: exp.targetAudience?.includes('Kids') || false,
      canPrivateGroup: exp.canBookAsPrivate,
      description: exp.experienceDescription || '',
      videoUrl: exp.video,
    };
  });

  readonly showLevel = computed(() => {
    const level = this.about().level;
    return level !== '' && level !== 'Not Applicable';
  });

  readonly showAccess = computed(() => {
    return this.about().audienceType !== 'Everyone';
  });

  readonly languagesText = computed(() => {
    return this.about().languages.join(', ');
  });

  readonly languageLabel = computed(() => {
    return this.about().languages.length > 1 ? 'Languages' : 'Language';
  });
}

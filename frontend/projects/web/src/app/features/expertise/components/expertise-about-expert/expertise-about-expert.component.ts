import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpertiseService } from '../../services/expertise.service';

export interface AboutExpertData {
  name: string;
  photoUrl: string;
  description: string;
  hubName?: string;
  location?: string;
}

@Component({
  selector: 'app-expertise-about-expert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-about-expert.component.html',
})
export class ExpertiseAboutExpertComponent {
  readonly slug = input.required<string>();
  private readonly expertiseService = inject(ExpertiseService);

  readonly expert = computed<AboutExpertData>(() => {
    const exp = this.expertiseService.expertise();
    if (!exp) {
      return { name: '', photoUrl: '', description: '' };
    }

    // Hub location has city/country, expertise location has city/state/country
    const hubLoc = exp.hub?.location;
    const expLoc = exp.location;
    const locationStr = expLoc
      ? [expLoc.city, expLoc.state, expLoc.country].filter(Boolean).join(', ')
      : hubLoc
        ? [hubLoc.city, hubLoc.country].filter(Boolean).join(', ')
        : '';

    return {
      name: exp.host?.name || exp.hub?.name || 'Expert',
      photoUrl: exp.host?.profileUrl || exp.hub?.logo || '',
      description: exp.host?.description || exp.hub?.description || '',
      hubName: exp.hub?.name,
      location: locationStr,
    };
  });

  readonly hasDescription = computed(() => !!this.expert().description);
  readonly hasLocation = computed(() => !!this.expert().location);

  readonly initials = computed(() => {
    const name = this.expert().name;
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  });

  onViewProfile(): void {
    // TODO: Navigate to expert/hub profile
    console.log('View profile clicked');
  }
}

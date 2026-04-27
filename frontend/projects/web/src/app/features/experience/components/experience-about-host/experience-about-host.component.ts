import { Component, input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExperienceService } from '../../services/experience.service';

export interface HostExpert {
  id: string;
  name: string;
  title?: string;
  profileUrl: string;
  description: string;
  location: string;
  hubLogo?: string;
  hubName?: string;
  hasExpertPage: boolean;
  hasOtherListings: boolean;
}

export interface AboutHostData {
  isHub: boolean;
  hubName?: string;
  hubSlug?: string;
  hubType?: string;
  hubProfileUrl?: string;
  hubDescription?: string;
  hubLocation?: string;
  hosts: HostExpert[];
}

@Component({
  selector: 'app-experience-about-host',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './experience-about-host.component.html',
})
export class ExperienceAboutHostComponent {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);

  readonly selectedHost = signal<HostExpert | null>(null);

  // Computed host data from service
  readonly aboutHost = computed<AboutHostData>(() => {
    const exp = this.experienceService.experience();
    if (!exp) {
      return { isHub: false, hosts: [] };
    }

    const hub = exp.hub;
    const hostDetails = exp.hostDetails || [];

    // Map host details to HostExpert format
    const hosts: HostExpert[] = hostDetails.map((host, idx) => ({
      id: host.userId || `host-${idx}`,
      name: host.name || 'Host',
      title: host.description,
      profileUrl: host.photoUrl || '',
      description: host.description || '',
      location: hub?.location
        ? `${hub.location.city}, ${hub.location.country}`
        : '',
      hubLogo: hub?.logo,
      hubName: hub?.name,
      hasExpertPage: !!host.userId,
      hasOtherListings: false,
    }));

    // If no hosts, show hub as host
    if (hosts.length === 0 && hub) {
      return {
        isHub: true,
        hubName: hub.name,
        hubSlug: hub.slug,
        hubProfileUrl: hub.logo,
        hubDescription: hub.description,
        hubLocation: hub.location
          ? `${hub.location.city}, ${hub.location.country}`
          : '',
        hosts: [],
      };
    }

    return {
      isHub: false,
      hubName: hub?.name,
      hubSlug: hub?.slug,
      hosts,
    };
  });

  readonly sectionTitle = computed(() => {
    const data = this.aboutHost();
    if (data.isHub) return 'Host';
    return data.hosts.length > 1 ? 'Experts' : 'Expert';
  });

  readonly currentHost = computed(() => {
    const selected = this.selectedHost();
    if (selected) return selected;
    return this.aboutHost().hosts[0] ?? null;
  });

  readonly hasMultipleHosts = computed(() => this.aboutHost().hosts.length > 1);

  selectHost(host: HostExpert): void {
    this.selectedHost.set(host);
  }

  onContact(): void {
    // TODO: Implement contact functionality
    console.log('Contact clicked');
  }
}

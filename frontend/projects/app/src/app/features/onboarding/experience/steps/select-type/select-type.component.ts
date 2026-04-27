import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';

type ExperienceType = 'express' | 'platform';

interface ExperienceOption {
  id: ExperienceType;
  title: string;
  description: string;
  features: string[];
}

@Component({
  selector: 'app-experience-select-type',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-type.component.html',
})
export class ExperienceSelectTypeComponent implements OnInit {
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly router = inject(Router);

  readonly selectedType = signal<ExperienceType>('express');
  readonly isLoading = signal(false);

  readonly experienceOptions: ExperienceOption[] = [
    {
      id: 'express',
      title: 'Express listing',
      description:
        'Start taking bookings without your listing being visible on the platform. This means that your Experience can only be found using a direct URL and will not be visible upon search. Turning an express listing into a platform listing can be done at any time via Manage Listings.',
      features: ['Accept bookings', 'Shareable link'],
    },
    {
      id: 'platform',
      title: 'Platform listing',
      description:
        'Add a description, photos, and more information for potential learners to view and access by browsing the platform.',
      features: [
        'Visible & searchable on mereka.io',
        'Add a location, links, posters, and more',
        'Customisable occurrences',
        'Customisable booking cutoff time',
        'Customisable access restrictions',
      ],
    },
  ];

  ngOnInit(): void {
    // Reset all forms when starting a new experience
    this.onboardingService.reset();
  }

  selectType(type: ExperienceType): void {
    this.selectedType.set(type);
  }

  goBack(): void {
    this.router.navigate(['/hub/services/experiences']);
  }

  proceed(): void {
    const type = this.selectedType();
    if (type === 'express') {
      this.router.navigate(['/onboarding/experience/express']);
    } else {
      this.router.navigate(['/onboarding/experience/platform/basic-info']);
    }
  }
}

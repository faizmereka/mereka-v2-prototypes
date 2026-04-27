import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

export type WelcomeType = 'learner' | 'hub' | 'expert';

interface ServiceItem {
  title: string;
  description: string;
  animation: string;
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  imports: [CommonModule, RouterLink],
})
export class WelcomeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The type of welcome - determines navigation after getting started */
  readonly type = signal<WelcomeType>('learner');

  /** Custom redirect path after getting started */
  readonly redirectPath = signal<string | null>(null);

  /** Mobile breakpoint detection */
  readonly isMobile = signal(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  readonly currentSlide = signal(0);

  readonly services: ServiceItem[] = [
    {
      title: 'Expertise',
      description: 'Book sessions with vetted Experts for growth in your business, career, or personal well-being.',
      animation: 'expertise',
    },
    {
      title: 'Experiences',
      description: "Whether it's a seminar, a creative workshop, or a fun event that you're looking for, we have you covered!",
      animation: 'experience',
    },
    {
      title: 'Spaces',
      description: 'Need well equipped facilities to take your craft or event to the next level? Spaces are the way to go!',
      animation: 'space',
    },
  ];

  readonly totalSlides = computed(() => (this.isMobile() ? this.services.length + 1 : 1));

  readonly isBeginning = computed(() => this.currentSlide() === 0);
  readonly isEnd = computed(() => this.currentSlide() === this.totalSlides() - 1);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  ngOnInit(): void {
    // Read from route data
    const data = this.route.snapshot.data;
    if (data['type']) {
      this.type.set(data['type'] as WelcomeType);
    }
    if (data['redirectPath']) {
      this.redirectPath.set(data['redirectPath']);
    }

    // Initial mobile check
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 768);
    }
  }

  nextSlide(): void {
    if (this.currentSlide() < this.totalSlides() - 1) {
      this.currentSlide.update((v) => v + 1);
    }
  }

  prevSlide(): void {
    if (this.currentSlide() > 0) {
      this.currentSlide.update((v) => v - 1);
    }
  }

  getStarted(): void {
    const redirect = this.redirectPath();
    if (redirect) {
      this.router.navigate([redirect]);
      return;
    }

    // Default navigation based on type
    const typeValue = this.type();
    switch (typeValue) {
      case 'hub':
        this.router.navigate(['/onboarding/hub']);
        break;
      case 'expert':
        this.router.navigate(['/onboarding/expert']);
        break;
      case 'learner':
      default:
        this.router.navigate(['/onboarding/learner']);
        break;
    }
  }
}

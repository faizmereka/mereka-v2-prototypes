import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import {
  CheckoutApiService,
  AuthService,
} from '../../../core/services';
import type { ProposalSuccessData } from '../models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-proposal-success-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proposal-success.page.html',
})
export class ProposalSuccessPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly authService = inject(AuthService);

  // State
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Data
  readonly successData = signal<ProposalSuccessData | null>(null);

  // Computed
  readonly proposal = computed(() => this.successData()?.proposal);
  readonly job = computed(() => this.successData()?.job);

  readonly totalPrice = computed(() => {
    const p = this.proposal();
    if (!p) return 0;
    if (p.priceType === 'fixed') {
      return p.proposedPrice || 0;
    }
    return (p.hourlyProposedPrice || 0) * (p.workingHours || 0);
  });

  // URLs from environment
  readonly proposalsUrl = `${environment.appUrls.app}/hub/jobs/applications?tab=proposed`;
  readonly browseJobsUrl = `${environment.appUrls.web}/jobs`;

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Initialize auth
    await this.authService.init();

    // Get proposal ID from URL
    const proposalId = this.route.snapshot.paramMap.get('proposalId');
    if (!proposalId) {
      this.error.set('Invalid URL');
      this.loading.set(false);
      return;
    }

    try {
      const data = await this.checkoutApi.getProposalSuccess(proposalId);
      this.successData.set(data);
    } catch (err: unknown) {
      console.error('Load proposal success error:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to load proposal details');
    } finally {
      this.loading.set(false);
    }
  }
}

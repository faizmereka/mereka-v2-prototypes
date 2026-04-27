import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { TransferState, makeStateKey } from '@angular/core';
import { JobService } from '../services/job.service';
import type { JobDetail } from '../models/job.model';

/**
 * Route resolver for job detail page.
 *
 * Modern Angular approach:
 * - SSR: Block and fetch data (critical for SEO and initial render)
 * - Client (hydration): Use TransferState data (instant, no fetch)
 * - Client (navigation): Return null immediately, component shows skeleton and fetches
 *
 * This prevents the "lag" on client-side navigation while maintaining SSR benefits.
 */
export const jobResolver: ResolveFn<JobDetail | null> = (
  route: ActivatedRouteSnapshot
) => {
  const jobService = inject(JobService);
  const platformId = inject(PLATFORM_ID);
  const transferState = inject(TransferState);
  const id = route.paramMap.get('id');

  if (!id) {
    return null;
  }

  // On SERVER: Always fetch and block (needed for SSR/SEO)
  if (isPlatformServer(platformId)) {
    return jobService.getJobById(id);
  }

  // On CLIENT: Check if we have TransferState data from SSR
  const stateKey = makeStateKey<JobDetail>(`job-${id}`);
  const transferredData = transferState.get(stateKey, null);

  if (transferredData) {
    // Hydration: Use SSR data immediately (TransferState handles cleanup)
    return jobService.getJobById(id);
  }

  // Client navigation: Return null immediately
  // Component will detect this and fetch data with skeleton
  return null;
};

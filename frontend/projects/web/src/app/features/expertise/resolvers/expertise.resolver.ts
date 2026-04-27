import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { TransferState, makeStateKey } from '@angular/core';
import { ExpertiseService } from '../services/expertise.service';
import type { ExpertiseDetail } from '../models/expertise.model';

/**
 * Route resolver for expertise detail page.
 *
 * Modern Angular approach:
 * - SSR: Block and fetch data (critical for SEO and initial render)
 * - Client (hydration): Use TransferState data (instant, no fetch)
 * - Client (navigation): Return null immediately, component shows skeleton and fetches
 *
 * This prevents the "lag" on client-side navigation while maintaining SSR benefits.
 */
export const expertiseResolver: ResolveFn<ExpertiseDetail | null> = (
  route: ActivatedRouteSnapshot
) => {
  const expertiseService = inject(ExpertiseService);
  const platformId = inject(PLATFORM_ID);
  const transferState = inject(TransferState);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return null;
  }

  // On SERVER: Always fetch and block (needed for SSR/SEO)
  if (isPlatformServer(platformId)) {
    return expertiseService.getExpertiseBySlug(slug);
  }

  // On CLIENT: Check if we have TransferState data from SSR
  const stateKey = makeStateKey<ExpertiseDetail>(`expertise-${slug}`);
  const transferredData = transferState.get(stateKey, null);

  if (transferredData) {
    // Hydration: Use SSR data immediately (TransferState handles cleanup)
    return expertiseService.getExpertiseBySlug(slug);
  }

  // Client navigation: Return null immediately
  // Component will detect this and fetch data with skeleton
  return null;
};

import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { HomeService } from '../services/home.service';
import type { HomeData } from '../models/home.model';

/**
 * Route resolver for home page data.
 * Ensures data is loaded BEFORE the page renders (critical for SSR).
 * This prevents hydration mismatches and double fetches.
 */
export const homeResolver: ResolveFn<HomeData | null> = () => {
  const homeService = inject(HomeService);
  return homeService.getHomeData();
};

import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import type { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ExpertService } from '../services';
import type { ExpertDetail, ExpertListResult } from '../models';

/**
 * Resolver for expert detail page
 * Prefetches expert data on server for SSR
 */
export const expertDetailResolver: ResolveFn<ExpertDetail | null> = async (
  route: ActivatedRouteSnapshot
) => {
  const service = inject(ExpertService);
  const platformId = inject(PLATFORM_ID);
  const slug = route.params['slug'];

  if (!slug) return null;

  // On server, wait for data to be fetched
  if (isPlatformServer(platformId)) {
    return firstValueFrom(service.getExpertBySlug(slug));
  }

  // On client, return null and let component handle loading
  // The service will check TransferState first
  service.getExpertBySlug(slug).subscribe();
  return null;
};

/**
 * Resolver for expert list page
 * Prefetches experts data on server for SSR
 */
export const expertListResolver: ResolveFn<ExpertListResult | null> = async (
  route: ActivatedRouteSnapshot
) => {
  const service = inject(ExpertService);
  const platformId = inject(PLATFORM_ID);

  // Extract query params for filtering
  const filters = {
    page: route.queryParams['page'] ? +route.queryParams['page'] : 1,
    limit: route.queryParams['limit'] ? +route.queryParams['limit'] : 20,
    focusArea: route.queryParams['focusArea'],
    skill: route.queryParams['skill'],
    city: route.queryParams['city'],
    country: route.queryParams['country'],
    search: route.queryParams['search'],
    hubId: route.queryParams['hubId'],
  };

  // On server, wait for data to be fetched
  if (isPlatformServer(platformId)) {
    return firstValueFrom(service.getExperts(filters));
  }

  // On client, return null and let component handle loading
  service.getExperts(filters).subscribe();
  return null;
};

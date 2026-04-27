import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import type { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HubService } from '../services';
import type { HubDetail, HubListResult } from '../models';

/**
 * Resolver for hub detail page
 * Prefetches hub data on server for SSR
 */
export const hubDetailResolver: ResolveFn<HubDetail | null> = async (
  route: ActivatedRouteSnapshot
) => {
  const service = inject(HubService);
  const platformId = inject(PLATFORM_ID);
  const slug = route.params['slug'];

  if (!slug) return null;

  // On server, wait for data to be fetched
  if (isPlatformServer(platformId)) {
    return firstValueFrom(service.getHubBySlug(slug));
  }

  // On client, return null and let component handle loading
  // The service will check TransferState first
  service.getHubBySlug(slug).subscribe();
  return null;
};

/**
 * Resolver for hub list page
 * Prefetches hubs data on server for SSR
 */
export const hubListResolver: ResolveFn<HubListResult | null> = async (
  route: ActivatedRouteSnapshot
) => {
  const service = inject(HubService);
  const platformId = inject(PLATFORM_ID);

  // Extract query params for filtering
  const filters = {
    page: route.queryParams['page'] ? +route.queryParams['page'] : 1,
    limit: route.queryParams['limit'] ? +route.queryParams['limit'] : 20,
    focusArea: route.queryParams['focusArea'],
    companyType: route.queryParams['companyType'],
    city: route.queryParams['city'],
    country: route.queryParams['country'],
    search: route.queryParams['search'],
    featured: route.queryParams['featured'] === 'true' ? true : undefined,
  };

  // On server, wait for data to be fetched
  if (isPlatformServer(platformId)) {
    return firstValueFrom(service.getHubs(filters));
  }

  // On client, return null and let component handle loading
  service.getHubs(filters).subscribe();
  return null;
};

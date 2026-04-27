import { InjectionToken } from '@angular/core';

/**
 * Base URL for the backend API (e.g. 'http://localhost:4000/api/v1').
 * Must be provided in app config for SearchService to work.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

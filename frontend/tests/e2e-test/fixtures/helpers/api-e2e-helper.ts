/**
 * API Helper for E2E Tests
 * 
 * Helper functions to make API calls from E2E tests for verification
 */

import { APIRequestContext, expect } from '@playwright/test';

const BACKEND_V2_BASE_URL = process.env.BACKEND_V2_URL || 'https://api.mereka.dev';
const apiUrl = `${BACKEND_V2_BASE_URL}/api/v1`;

/**
 * Get homepage data from API
 */
export async function getHomepageData(request: APIRequestContext): Promise<any> {
  const response = await request.get(`${apiUrl}/home/`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body.data;
}

/**
 * Search API endpoint
 */
export async function searchApi(
  request: APIRequestContext,
  query: string,
  type?: string
): Promise<any> {
  const url = type 
    ? `${apiUrl}/search/?q=${query}&type=${type}`
    : `${apiUrl}/search/?q=${query}`;
  
  const response = await request.get(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body.data;
}

/**
 * Get experience by slug
 */
export async function getExperienceBySlug(
  request: APIRequestContext,
  slug: string
): Promise<any> {
  const response = await request.get(`${apiUrl}/experiences/${slug}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body.data;
}

/**
 * Get expert by slug
 */
export async function getExpertBySlug(
  request: APIRequestContext,
  slug: string
): Promise<any> {
  const response = await request.get(`${apiUrl}/experts/${slug}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body.data;
}

/**
 * Get user profile via API (requires auth token)
 */
export async function getUserProfile(
  request: APIRequestContext,
  accessToken: string
): Promise<any> {
  const response = await request.get(`${apiUrl}/users/me/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  return body.data;
}

/**
 * Compare API data with UI data
 */
export function compareApiWithUI(apiData: any, uiData: any, fields: string[]): boolean {
  for (const field of fields) {
    if (apiData[field] !== uiData[field]) {
      console.log(`Field mismatch: ${field} - API: ${apiData[field]}, UI: ${uiData[field]}`);
      return false;
    }
  }
  return true;
}

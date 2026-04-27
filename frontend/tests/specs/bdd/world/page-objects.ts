import type { Page } from '@playwright/test';

export interface PageObjects {
  page: Page;
}

export function createPageObjects(page: Page): PageObjects {
  return { page };
}

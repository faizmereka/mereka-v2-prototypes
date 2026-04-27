import { World } from '@cucumber/cucumber';
import type { Page } from '@playwright/test';

export class TestContext extends World {
  private _page?: Page;
  private _data: Record<string, unknown> = {};

  setPage(page: Page) {
    this._page = page;
  }

  get page() {
    if (!this._page) {
      throw new Error('Playwright page is not initialized for this scenario.');
    }
    return this._page;
  }

  setData(key: string, value: unknown) {
    this._data[key] = value;
  }

  getData<T = unknown>(key: string): T | undefined {
    return this._data[key] as T | undefined;
  }
}

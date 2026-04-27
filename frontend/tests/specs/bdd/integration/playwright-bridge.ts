import { Before, After, setWorldConstructor } from '@cucumber/cucumber';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { TestContext } from '../world/test-context';

let browser: Browser | undefined;

setWorldConstructor(TestContext);

Before(async function (this: TestContext) {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }

  const storageStatePath = path.resolve(__dirname, '../../../e2e-test/.auth/user.json');
  const context: BrowserContext = await browser.newContext({
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
  });
  const page: Page = await context.newPage();
  this.setPage(page);
});

After(async function (this: TestContext) {
  await this.page.context().close();
});

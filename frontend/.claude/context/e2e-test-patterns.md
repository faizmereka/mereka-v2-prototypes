# E2E Test Patterns

Test patterns and best practices for frontend-workspace-v2 E2E tests using Playwright.

## Test Types Overview

Frontend-workspace-v2 has two distinct test types:

| Test Type | Framework | Location | Purpose | Speed |
|-----------|-----------|----------|---------|-------|
| **Unit Tests** | Karma/Vitest | `src/**/*.spec.ts` | Component testing | ⚡ Fast |
| **E2E Tests** | Playwright | `tests/e2e-test/tests/` | User journey testing | 🐢 Slower |

## E2E Test Structure

### File Location
- **Directory**: `tests/e2e-test/tests/`
- **Naming**: `[feature]-[scenario].spec.ts` (kebab-case)
- **Example**: `auth-login.spec.ts`

### Standard E2E Test Pattern

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../../fixtures/auth-page';

// Test credentials (use environment variables)
const TEST_EMAIL = process.env.TEST_EMAIL || 'testingmereka01@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'merekamereka';

test.describe('Feature E2E Tests', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test('should perform user action successfully', async ({ page }) => {
    // Navigate to page
    await authPage.gotoAuth();
    
    // Perform actions
    await authPage.clickContinueWithEmail();
    await authPage.enterEmail(TEST_EMAIL);
    await authPage.clickContinue();
    
    // Verify results
    await expect(page).toHaveURL(/expected-url/);
  });
});
```

## Key Patterns

### Page Object Model Pattern

**Always use Page Object Model**:

```typescript
import { Page, Locator, expect } from '@playwright/test';

export class FeaturePage {
  readonly page: Page;
  readonly button: Locator;
  readonly input: Locator;

  constructor(page: Page) {
    this.page = page;
    this.button = page.getByRole('button', { name: /button name/i });
    this.input = page.getByPlaceholder(/placeholder/i);
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async performAction() {
    await this.button.click();
    await this.page.waitForTimeout(500);
  }
}
```

### Base URL Configuration

**Use environment variables**:

```typescript
// Environment configuration
const environments = {
  dev: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  staging: {
    baseURL: process.env.FRONTEND_URL || 'https://v2-staging.mereka.io',
  },
  production: {
    baseURL: process.env.FRONTEND_URL || 'https://v2.mereka.dev',
  },
};

const ENV = process.env.TEST_ENV || 'production';
const baseURL = environments[ENV as keyof typeof environments]?.baseURL || environments.production.baseURL;
```

### Test Data Pattern

**Use environment variables for test data**:

```typescript
// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'testingmereka01@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'merekamereka';

// Test data
const INVALID_EMAIL = 'invalid-email';
const NON_EXISTENT_EMAIL = `nonexistent-${Date.now()}@example.com`;
```

### Selector Patterns

**Prefer semantic selectors**:

```typescript
// Good: Semantic selectors
page.getByRole('button', { name: /continue with email/i })
page.getByPlaceholder(/email/i)
page.getByLabel(/email address/i)
page.getByText(/error message/i)

// Avoid: CSS selectors (unless necessary)
page.locator('.btn-primary') // Avoid
page.locator('#email-input') // Avoid
```

### Wait Patterns

**Use proper waits**:

```typescript
// Wait for page load
await page.waitForLoadState('networkidle');

// Wait for element
await expect(element).toBeVisible();

// Wait for navigation
await page.waitForURL(/expected-url/);

// Wait for API response
await page.waitForResponse(response => 
  response.url().includes('/api/') && response.status() === 200
);
```

### Error Handling Pattern

**Test error scenarios**:

```typescript
test('should show error for invalid input', async ({ page }) => {
  await authPage.gotoAuth();
  await authPage.enterEmail(INVALID_EMAIL);
  
  // Check for validation error
  const errorElement = page.getByText(/invalid|valid|format/i);
  await expect(errorElement).toBeVisible({ timeout: 2000 });
});
```

## Common Test Patterns

### Login Flow

```typescript
test('should successfully login', async ({ page }) => {
  await authPage.gotoAuth();
  await authPage.clickContinueWithEmail();
  await authPage.enterEmail(TEST_EMAIL);
  await authPage.clickContinue();
  await authPage.clickUsePassword();
  await authPage.enterPassword(TEST_PASSWORD);
  await authPage.clickSignIn();
  await authPage.verifyLoggedIn();
});
```

### Form Submission

```typescript
test('should submit form successfully', async ({ page }) => {
  await page.goto('/form-page');
  await page.getByLabel('Name').fill('Test Name');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: /submit/i }).click();
  
  await expect(page).toHaveURL(/success/);
  await expect(page.getByText(/success/i)).toBeVisible();
});
```

### Navigation Flow

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('link', { name: /about/i }).click();
  await expect(page).toHaveURL(/about/);
  
  await page.getByRole('link', { name: /home/i }).click();
  await expect(page).toHaveURL(/home/);
});
```

## Multiple Frontend Apps

The frontend workspace has 5 apps:

- **web** (port 4200) - Public website (`https://v2.mereka.dev`)
- **app** (port 4202) - Main app (`https://v2.app.mereka.dev`)
- **auth** (port 4201) - Authentication (`https://v2.auth.mereka.dev`)
- **admin** (port 4204) - Administration (`https://v2.admin.mereka.dev`)
- **checkout** (port 4203) - Payment flow (`https://v2.checkout.mereka.dev`)

### Cross-App Testing

```typescript
test('should navigate from auth to app', async ({ page }) => {
  // Start on auth app
  await page.goto('https://v2.auth.mereka.dev');
  await authPage.login(TEST_EMAIL, TEST_PASSWORD);
  
  // Should redirect to app
  await expect(page).toHaveURL(/v2\.mereka\.dev/);
});
```

## Helper Functions

### Available Fixtures

**Location**: `tests/e2e-test/fixtures/`

- **auth-page.ts**: `AuthPage` class for authentication flows
- **home-page.ts**: `HomePage` class for home page interactions

### Using Fixtures

```typescript
import { AuthPage } from '../../fixtures/auth-page';
import { HomePage } from '../../fixtures/home-page';

test.describe('Feature Tests', () => {
  let authPage: AuthPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    homePage = new HomePage(page);
  });
});
```

## Test Organization

### Feature-Based Organization

```
tests/e2e-test/tests/
├── auth/
│   ├── auth-login.spec.ts
│   ├── auth-registration.spec.ts
│   └── auth-logout.spec.ts
├── experience/
│   ├── create-physical-experience.spec.ts
│   └── home-to-experience-redirection.spec.ts
└── home/
    └── home-page-elements.spec.ts
```

### Test Suite Structure

```typescript
test.describe('Feature E2E Tests', () => {
  // Group related tests
  test.describe('Login Flow', () => {
    // Login tests
  });

  test.describe('Registration Flow', () => {
    // Registration tests
  });
});
```

## Differences from Unit Tests

| Aspect | Unit Tests | E2E Tests |
|--------|-----------|------------|
| **Framework** | Karma/Vitest | Playwright |
| **Execution** | In-process | Browser automation |
| **Frontend** | Not required | Required |
| **Speed** | Fast | Slower |
| **Purpose** | Component testing | User journey testing |
| **Location** | `src/**/*.spec.ts` | `tests/e2e-test/tests/` |
| **Selectors** | Component references | DOM selectors |

## Best Practices

### 1. Always Use Page Object Model
```typescript
// Good
const authPage = new AuthPage(page);
await authPage.login(email, password);

// Avoid
await page.getByRole('button', { name: /sign in/i }).click();
```

### 2. Use Semantic Selectors
```typescript
// Good
page.getByRole('button', { name: /continue/i })
page.getByPlaceholder(/email/i)

// Avoid
page.locator('.btn-primary')
page.locator('#email-input')
```

### 3. Proper Waits
```typescript
// Good
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();

// Avoid
await page.waitForTimeout(5000); // Only if necessary
```

### 4. Test Both Success and Error Cases
```typescript
// Success case
test('should login successfully', async ({ page }) => {
  // ...
});

// Error case
test('should show error for invalid credentials', async ({ page }) => {
  // ...
});
```

### 5. Use Environment Variables
```typescript
// Good
const TEST_EMAIL = process.env.TEST_EMAIL || 'default@example.com';

// Avoid
const TEST_EMAIL = 'hardcoded@example.com';
```

### 6. Test Isolation
```typescript
// Each test should be independent
// Use unique test data
// Clean up if needed
```

### 7. Console Logging
```typescript
// Add console.log for debugging
console.log('Navigating to auth page');
await authPage.gotoAuth();
```

## Common Mistakes to Avoid

- ❌ Not using Page Object Model
- ❌ Using CSS selectors instead of semantic selectors
- ❌ Not waiting for elements properly
- ❌ Hardcoding test data
- ❌ Not testing error scenarios
- ❌ Not isolating tests
- ❌ Using fixed timeouts instead of proper waits

## Running E2E Tests

```bash
# Run all E2E tests
npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run specific test file
npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/auth/auth-login.spec.ts

# Run with custom frontend URL
FRONTEND_URL=https://v2.mereka.dev npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run against staging
TEST_ENV=staging npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run in headed mode
npx playwright test --config=tests/e2e-test/playwright.config.ts --headed

# Run with UI mode
npx playwright test --config=tests/e2e-test/playwright.config.ts --ui
```

## File References

- **E2E test example**: `tests/e2e-test/tests/auth/auth-login.spec.ts`
- **Page Object example**: `tests/e2e-test/fixtures/auth-page.ts`
- **Playwright config**: `tests/e2e-test/playwright.config.ts`
- **E2E README**: `tests/e2e-test/README.md`

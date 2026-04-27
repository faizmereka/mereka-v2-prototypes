# E2E Tests - Browser-Based Testing

**Purpose**: End-to-end tests using Playwright to validate the frontend application via browser automation.

**Framework**: Playwright Test  
**Execution**: Browser automation (requires frontend application running)  
**Test Type**: E2E tests (full user journey)

---

## 📁 Directory Structure

```
e2e-test/
├── tests/                    # Test specification files
│   ├── auth-login.spec.ts    # Login flow tests
│   ├── auth-registration.spec.ts  # Registration flow tests
│   ├── auth-logout.spec.ts   # Logout flow tests
│   └── auth-password-reset.spec.ts  # Password reset tests
│
├── fixtures/                 # Page objects and test utilities
│   └── auth-page.ts          # Authentication page object model
│
├── playwright.config.ts      # Playwright configuration
└── README.md                 # This file
```

---

## 🚀 Running Tests

### Prerequisites

1. **Install Playwright dependencies**:
   ```bash
   npm install
   npx playwright install
   ```

2. **Frontend application should be running** (for local testing):
   - Production: `https://v2.mereka.dev` (default)
   - Staging: `https://v2-staging.mereka.io`
   - Local: `http://localhost:5173`

### Run Commands

```bash
# Run all E2E tests
npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run specific test file
npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/auth-login.spec.ts

# Run with custom frontend URL
FRONTEND_URL=https://v2.mereka.dev npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run against staging
TEST_ENV=staging npx playwright test --config=tests/e2e-test/playwright.config.ts

# Run in headed mode (see browser)
npx playwright test --config=tests/e2e-test/playwright.config.ts --headed

# Run with UI mode
npx playwright test --config=tests/e2e-test/playwright.config.ts --ui
```

---

## 🔧 Configuration

### Environment Variables

- `FRONTEND_URL` - Frontend application URL (default: `https://v2.mereka.dev`)
- `BACKEND_V2_URL` - Backend API URL (default: `https://api.mereka.dev`)
- `TEST_ENV` - Test environment: `dev`, `staging`, or `production`
- `TEST_EMAIL` - Test user email (optional, default: `testingmereka01@gmail.com`)
- `TEST_PASSWORD` - Test user password (optional, default: `merekamereka`)

### Playwright Config

Configuration file: `playwright.config.ts`

- **Test Directory**: `./tests`
- **Base URL**: Configurable via `FRONTEND_URL`
- **Timeout**: 30 seconds (configurable per environment)
- **Browsers**: Chromium (default), Firefox and WebKit can be enabled
- **Reporters**: HTML + JUnit XML (for CI/CD)

---

## 📊 Test Coverage

### Authentication Tests

#### Login Flow (`auth-login.spec.ts`)
- ✅ Successful login with valid email and password
- ✅ Login with invalid email format
- ✅ Login with invalid password
- ✅ Login with non-existent email
- ✅ Login flow navigation (back button)
- ✅ Social login options visibility
- ✅ Empty form validation
- ✅ Forgot password link visibility
- ✅ Email persistence when navigating back

#### Registration Flow (`auth-registration.spec.ts`)
- ✅ Navigate to registration page
- ✅ Registration form fields visibility
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Duplicate email prevention

#### Logout Flow (`auth-logout.spec.ts`)
- ✅ Successful logout after login
- ✅ Authentication tokens cleared after logout
- ✅ Protected pages require login after logout

#### Password Reset Flow (`auth-password-reset.spec.ts`)
- ✅ Navigate to password reset page
- ✅ Request password reset for valid email
- ✅ Invalid email format validation
- ✅ Non-existent email handling
- ✅ Navigation back from password reset

---

## 🧾 Markdown Report Output

Every E2E run generates an honest Markdown report at:
`../../docs/testing/e2e-report-{timestamp}.md`

The report includes:
- Summary of results
- Gaps and shortcomings analysis
- GitHub-issue formatted recommendation ticket

---

## 📝 Writing New Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../fixtures/auth-page';

test.describe('Feature E2E Tests', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test('should perform user action', async ({ page }) => {
    // Navigate and interact
    await authPage.goto();
    await authPage.clickButton();
    
    // Verify results
    await expect(page).toHaveURL(/expected-url/);
  });
});
```

### Page Object Model

Use the Page Object Model pattern for maintainability:

```typescript
export class FeaturePage {
  readonly page: Page;
  readonly button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.button = page.getByRole('button', { name: /button name/i });
  }

  async performAction() {
    await this.button.click();
  }
}
```

---

## 🐛 Troubleshooting

### Frontend Not Running

**Error**: `net::ERR_CONNECTION_REFUSED`

**Solution**:
```bash
# Use deployed frontend
FRONTEND_URL=https://v2.mereka.dev npx playwright test --config=tests/e2e-test/playwright.config.ts

# Or start local frontend
cd path/to/frontend
npm run dev
```

### Element Not Found

**Error**: `Locator.click: Timeout`

**Solution**:
- Check if element selector is correct
- Verify element is visible (not hidden by CSS)
- Add explicit waits: `await page.waitForSelector('selector')`
- Use more specific selectors (data-testid, aria-labels)

### Flaky Tests

**Solutions**:
- Add explicit waits for network requests: `await page.waitForLoadState('networkidle')`
- Use `waitForTimeout` sparingly, prefer `waitForSelector` or `waitForLoadState`
- Increase timeout for slow operations
- Use `page.waitForResponse()` for API calls

---

## 🔑 Key Differences from API Tests

| Aspect | API Tests | E2E Tests |
|--------|-----------|-----------|
| **Framework** | Playwright (request context) | Playwright (browser context) |
| **Execution** | HTTP requests | Browser automation |
| **Frontend** | Not required | Required |
| **Speed** | Fast | Slower (browser rendering) |
| **Purpose** | Backend validation | Full user journey validation |

---

## 📚 Related Documentation

- **API Tests**: `../qa-api-test/README.md`
- **Integration Tests**: `../integration/README.md`
- **Unit Tests**: `../unit/README.md`

---

**Last Updated**: January 2026

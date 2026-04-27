# Skip Login Guide - Optimizing E2E Test Performance

This guide explains how to skip the login step in E2E tests to save ~20 seconds per test run.

## Quick Start

### Option 1: Use SKIP_LOGIN Environment Variable (Simplest)

```bash
# Windows PowerShell
$env:SKIP_LOGIN = "true"
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed

# Linux/Mac
SKIP_LOGIN=true npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed
```

**Important**: This assumes you're already authenticated. If you're not logged in, the test will fail.

### Option 2: Use Playwright storageState (Recommended for Multiple Tests)

This is the **best option** if you run multiple tests. Authenticate once, reuse the session across all tests.

#### Step 1: Create a Setup Script

Create `tests/e2e-test/global-setup.ts`:

```typescript
import { chromium, FullConfig } from '@playwright/test';
import { loginUser } from './fixtures/helpers/auth-e2e-helper';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  if (!baseURL) {
    throw new Error('baseURL is required');
  }

  console.log('🔐 Authenticating user for storageState...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login using the helper
  await loginUser(page);
  
  // Save authentication state
  await page.context().storageState({ path: 'tests/e2e-test/.auth/user.json' });
  await browser.close();
  
  console.log('✅ Authentication state saved to .auth/user.json');
}

export default globalSetup;
```

#### Step 2: Update playwright.config.ts

Add `globalSetup` and `storageState` to your config:

```typescript
export default defineConfig({
  // ... existing config ...
  globalSetup: './global-setup.ts', // Add this
  use: {
    baseURL: envConfig.baseURL,
    // ... existing use config ...
    storageState: 'tests/e2e-test/.auth/user.json', // Add this
  },
  // ... rest of config ...
});
```

#### Step 3: Add .auth to .gitignore

```gitignore
# Authentication state (contains sensitive session data)
tests/e2e-test/.auth/
```

#### Step 4: Run Tests

```bash
# First run: Authenticates and saves state
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed

# Subsequent runs: Uses saved authentication state (no login needed!)
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed
```

**Benefits**:
- ✅ Authenticate once, reuse across all tests
- ✅ Saves ~20 seconds per test
- ✅ Works automatically for all tests
- ✅ No need to set SKIP_LOGIN=true

### Option 3: Manual Login Before Test (For Development)

If you're manually testing and already logged in the browser:

```bash
# Just set SKIP_LOGIN=true
$env:SKIP_LOGIN = "true"
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed
```

## How It Works

### With Login (Default)
```
Test Start → Login (~20s) → Navigate to Experience Creation → Fill Forms → Verify
```

### Without Login (SKIP_LOGIN=true)
```
Test Start → Navigate to Experience Creation → Fill Forms → Verify
```

### With storageState (Best)
```
First Run:  Test Start → Login (~20s) → Save State → Navigate → Fill Forms → Verify
Next Runs:  Test Start → Load State (~0.1s) → Navigate → Fill Forms → Verify
```

## Implementation Details

### New Helper Function

A new helper function `navigateToExperienceCreationWithoutLogin()` was added to `creation-flow-helpers.ts`:

```typescript
/**
 * Navigate to Experience Creation flow WITHOUT login (assumes user is already authenticated)
 * Use this when you want to skip the login step to save ~20 seconds
 */
export async function navigateToExperienceCreationWithoutLogin(page: Page): Promise<void>
```

### Test File Changes

The test file now checks `SKIP_LOGIN` environment variable:

```typescript
const SKIP_LOGIN = process.env.SKIP_LOGIN === 'true' || process.env.SKIP_LOGIN === '1';

// In test:
if (!SKIP_LOGIN) {
  await loginUser(page);
} else {
  // Skip login
}

if (SKIP_LOGIN) {
  await navigateToExperienceCreationWithoutLogin(page);
} else {
  await navigateToExperienceCreation(page);
}
```

## Troubleshooting

### Test Fails with "Not Authenticated" Error

**Problem**: You set `SKIP_LOGIN=true` but you're not authenticated.

**Solution**: 
1. Remove `SKIP_LOGIN=true` and run once to authenticate
2. Or use `storageState` approach (Option 2) which handles authentication automatically

### storageState File Not Found

**Problem**: `global-setup.ts` can't find the auth file.

**Solution**: 
1. Make sure `.auth/user.json` directory exists: `mkdir -p tests/e2e-test/.auth`
2. Run the test once to generate the file
3. Check that `.auth/` is in `.gitignore`

### Authentication State Expired

**Problem**: Saved authentication state expired (sessions typically expire after some time).

**Solution**: 
1. Delete `.auth/user.json`
2. Run the test again - `globalSetup` will re-authenticate automatically

## Performance Comparison

| Method | Time Saved | Best For |
|--------|------------|----------|
| Default (with login) | 0s | Single test runs |
| SKIP_LOGIN=true | ~20s per test | Manual testing, already authenticated |
| storageState | ~20s per test (after first run) | Multiple test runs, CI/CD |

## Recommendations

1. **For Development**: Use `SKIP_LOGIN=true` when you're already logged in
2. **For CI/CD**: Use `storageState` approach (Option 2) for best performance
3. **For Single Test**: Default behavior (with login) is fine

## Related Files

- `tests/e2e-test/fixtures/helpers/creation-flow-helpers.ts` - Helper functions
- `tests/e2e-test/fixtures/helpers/auth-e2e-helper.ts` - Authentication helpers
- `tests/e2e-test/tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts` - Test file
- `tests/e2e-test/playwright.config.ts` - Playwright configuration

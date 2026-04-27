# StorageState Setup - Quick Reference

## ✅ What's Been Configured

1. **global-setup.ts** - Authenticates once before all tests and saves state
2. **playwright.config.ts** - Configured to use storageState automatically
3. **Test file** - Updated to navigate directly to `/onboarding/experience/platform/basic-info`
4. **.gitignore** - Added `.auth/` directory to ignore authentication state files

## 🚀 How It Works

1. **First Run**: `global-setup.ts` runs automatically, authenticates the user, and saves the state to `.auth/user.json`
2. **Subsequent Runs**: Playwright automatically loads the saved authentication state - no login needed!
3. **Test Execution**: Test navigates directly to the experience creation form

## 📝 Running Tests

```bash
# Just run the test - authentication happens automatically!
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed

# With specific environment
$env:TEST_ENV = "staging"
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed

# To publish the experience
$env:PUBLISH_EXPERIENCE = "true"
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed
```

## ⚡ Performance Benefits

- **Before**: Login (~20s) + Navigation (~10s) = ~30 seconds per test
- **After**: Direct navigation (~2s) = ~2 seconds per test
- **Time Saved**: ~28 seconds per test run! 🎉

## 🔧 Troubleshooting

### Authentication State Expired

If you get authentication errors, delete the auth file and re-run:

```bash
# Windows PowerShell
Remove-Item tests\e2e-test\.auth\user.json -ErrorAction SilentlyContinue
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed

# Linux/Mac
rm -f tests/e2e-test/.auth/user.json
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed
```

The `global-setup.ts` will automatically re-authenticate on the next run.

### Force Re-authentication

To force re-authentication, delete the `.auth` directory:

```bash
# Windows PowerShell
Remove-Item tests\e2e-test\.auth -Recurse -Force
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed

# Linux/Mac
rm -rf tests/e2e-test/.auth
npx playwright test tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts --headed
```

## 📁 Files Modified

- `tests/e2e-test/global-setup.ts` - New file for authentication setup
- `tests/e2e-test/playwright.config.ts` - Added `globalSetup` and `storageState`
- `tests/e2e-test/tests/v2-e2e/experience/experience-creation-complete-flow-e2e.spec.ts` - Updated to navigate directly
- `.gitignore` - Added `.auth/` directory

## 🎯 What Changed in the Test

**Before:**
```typescript
// Login
await loginUser(page);
// Navigate through UI
await navigateToExperienceCreation(page);
await selectExperienceType(page, 'platform');
```

**After:**
```typescript
// Direct navigation (authentication handled by storageState)
await page.goto(`${APP_URL}/onboarding/experience/platform/basic-info`);
```

The test now starts directly on the experience creation form! 🚀

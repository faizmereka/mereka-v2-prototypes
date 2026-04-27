# E2E Tests - Feature-Based Organization

This directory contains end-to-end browser tests organized by feature, following the structure pattern from `mereka-qa-automation/tests`.

## ⚠️ Important: Test Consolidation

**As of January 27, 2026**, tests in `auth/`, `experience/`, and `home/` directories have been **consolidated and removed**. All tests are now in the `v2-e2e/` directory.

**For new test development**, please use: **`tests/v2-e2e/`**

See:
- **[v2-e2e/README.md](./v2-e2e/README.md)** - Consolidated test suite documentation
- **[ARCHIVED_TESTS.md](./ARCHIVED_TESTS.md)** - Migration notes and deprecation information

## Directory Structure

```
tests/
├── v2-e2e/                        # ✅ Consolidated V2 E2E Tests (USE THIS)
│   ├── auth/
│   ├── experience/
│   ├── home/
│   ├── expert/
│   ├── expertise/
│   ├── job/
│   ├── navigation/
│   ├── search/
│   └── user-profile/
├── ARCHIVED_TESTS.md              # Migration notes
└── README.md                       # This file
```

## Test Organization Principles

1. **Feature-Based**: Tests are organized by feature/domain area
2. **Consistent Structure**: Matches the pattern used in `mereka-qa-automation/tests`
3. **Easy Navigation**: Related tests are grouped together
4. **Scalable**: Easy to add new features without cluttering the root directory

## Running Tests

Tests can be run from the `tests/` directory root or by feature:

```bash
# Run all tests
npm test

# Run specific feature
npm test -- v2-e2e/auth/
npm test -- v2-e2e/experience/
npm test -- v2-e2e/home/

# Run specific test file
npm test -- v2-e2e/auth/authentication-e2e.spec.ts

# Run in headed mode (see browser)
npm run test:headed

# Run with UI mode
npm run test:ui
```

## Playwright Configuration

The `playwright.config.ts` is configured to:
- Recursively find all `*.spec.ts` files in `tests/` directory
- Support feature-based organization automatically
- No changes needed to config after reorganization
- Generate timestamped reports in `../../artifacts/playwright-report-e2e-{timestamp}/`

## Migration Notes

- **Date**: 2026-01-12
- **From**: Flat structure (all files in `tests/` root)
- **To**: Feature-based structure (organized by domain/feature)
- **Reason**: Better organization, easier maintenance, matches `mereka-qa-automation` pattern
- **Source**: Migrated from `mereka-qa-automation/tests` structure

## Future Additions

Potential feature directories to add:
- `expert/` - Expert profile and detail pages
- `expertise/` - Expertise collection and detail pages
- `job/` - Job posting, application, and collection
- `hub/` - Hub dashboard and management

# feat: Add E2E Testing Automation for Frontend V2

## Overview

This PR adds comprehensive E2E (End-to-End) testing automation infrastructure for the Mereka Frontend V2 application. The implementation includes 26 test cases covering Authentication, Homepage, and Experience flows, along with PDF report generation for stakeholder sharing.

## Test Coverage

### Total: 26 Test Cases

#### Authentication Tests (21 test cases)
- **Login Flow** (8 tests): Valid/invalid credentials, social login options, form validation
- **Registration Flow** (5 tests): Form fields, email/password validation, duplicate email handling
- **Logout Flow** (3 tests): Logout functionality, token cleanup, protected route access
- **Password Reset Flow** (5 tests): Reset request, email validation, navigation

#### Home Page Tests (1 test case)
- **Home Page Elements**: Comprehensive verification of all homepage sections (Hero, Featured Experts, Hubs, Expertise, Experiences, Jobs)

#### Experience Tests (4 test cases)
- **Experience Creation** (2 tests): Navigation to creation page, element accessibility
- **Experience Redirection** (2 tests): Detail page navigation for logged-in and anonymous users

## Current Test Status

- **Total Tests**: 26
- **Passed**: 23 (88.5%)
- **Failed**: 3 (11.5%)
  - Password reset timeout issues (2 tests) - Known issue with page navigation
  - Home page "View all Jobs" navigation (1 test) - Button doesn't navigate to `/jobs` route

## Features Added

### 1. Test Case Inventory Documentation
- **File**: `tests/e2e-test/TEST_CASES.md`
- Complete documentation of all 26 test cases
- Test descriptions, steps, and expected outcomes
- Test execution instructions and environment configuration

### 2. PDF Report Generation
- **Script**: `tests/e2e-test/scripts/generate-pdf-report.js`
- Converts Playwright HTML reports to PDF format
- Includes test summary, pass/fail counts, screenshots, and error details
- Ready for stakeholder sharing

### 3. NPM Scripts
- `npm test` - Run all E2E tests
- `npm run report:pdf` - Generate PDF from latest HTML report
- `npm run report:pdf:latest` - Generate PDF from most recent report
- `npm run test:with-pdf` - Run tests and generate PDF automatically

### 4. Git Configuration
- Updated `.gitignore` to exclude test artifacts and PDF reports
- Test artifacts stored in `artifacts/` directory (excluded from git)
- PDF reports stored in `artifacts/test-results/` (excluded from git)
- CI/CD reports (JUnit XML, JSON) kept for integration

## Test Environment

- **Default Environment**: Production (`https://v2.mereka.dev`)
- **Backend API**: `https://api.mereka.dev`
- **Test Framework**: Playwright
- **Browser**: Chromium (default)

## How to Run Tests

```bash
cd tests/e2e-test
npm test
```

## How to Generate PDF Report

```bash
cd tests/e2e-test
npm run report:pdf
```

## File Structure

```
tests/e2e-test/
├── tests/
│   ├── auth/          # Authentication tests (21 tests)
│   ├── home/          # Homepage tests (1 test)
│   └── experience/    # Experience tests (4 tests)
├── fixtures/          # Page objects and test utilities
├── scripts/
│   └── generate-pdf-report.js  # PDF generation script
├── TEST_CASES.md      # Complete test case inventory
├── playwright.config.ts
└── package.json
```

## CI/CD Integration

- JUnit XML reports: `artifacts/test-results/junit-e2e.xml`
- JSON test results: `artifacts/test-results/test-results-e2e.json`
- HTML reports: `artifacts/playwright-report-e2e-{timestamp}/`
- PDF reports: `artifacts/test-results/e2e-report-{timestamp}.pdf` (for CI/CD artifacts)

## Known Issues

1. **Password Reset Tests**: Two tests timeout due to page navigation issues after reset request submission
2. **Home Page Jobs Navigation**: "View all Jobs" button doesn't navigate to `/jobs` route as expected

These issues are documented in `TEST_CASES.md` and will be addressed in future PRs.

## Related Documentation

- Test Case Inventory: `tests/e2e-test/TEST_CASES.md`
- Test Execution Guide: `tests/e2e-test/README.md`
- Report Guide: `tests/e2e-test/REPORT_GUIDE.md`

## Testing Checklist

- [x] All 26 test cases implemented
- [x] Test case inventory documented
- [x] PDF generation script created and tested
- [x] Tests run successfully (23/26 passing)
- [x] PDF reports generated successfully
- [x] Branch synced with main
- [x] No merge conflicts
- [x] Test artifacts properly excluded from git
- [x] CI/CD integration ready

## Next Steps

1. Address known test failures (password reset, jobs navigation)
2. Add more test coverage for other features (Expert profiles, Job applications, etc.)
3. Integrate PDF generation into CI/CD pipeline
4. Set up scheduled test runs
5. Add cross-browser testing (Firefox, WebKit)

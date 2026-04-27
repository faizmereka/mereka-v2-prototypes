# E2E Test Report Guide

**Last Updated**: January 12, 2026

---

## 📊 Timestamped Reports

E2E tests automatically generate **timestamped HTML reports** to avoid overwriting previous test results, just like the backend QA API tests.

### Report Location

Reports are saved to:
```
../../artifacts/playwright-report-e2e-{timestamp}/
```

**Format**: `playwright-report-e2e-YYYY-MM-DDTHH-MM-SS`

**Example**: `playwright-report-e2e-2026-01-12T16-28-59`

---

## 📁 Report Types Generated

### 1. HTML Report (Timestamped)
- **Location**: `../../artifacts/playwright-report-e2e-{timestamp}/index.html`
- **Format**: Standalone HTML report (no server needed)
- **Contains**: 
  - Test results with pass/fail status
  - Screenshots (on failure)
  - Videos (on failure)
  - Execution timeline
  - Test details and error messages

### 2. JUnit XML Report
- **Location**: `../../artifacts/test-results/junit-e2e.xml`
- **Format**: XML (for CI/CD integration)
- **Use**: Integration with CI/CD pipelines, test result aggregation

### 3. JSON Report
- **Location**: `../../artifacts/test-results/test-results-e2e.json`
- **Format**: JSON (for programmatic access)
- **Use**: Custom report generation, data analysis

### 4. Markdown Report (Honest Summary + Gaps + Ticket)
- **Location**: `../../docs/testing/e2e-report-{timestamp}.md`
- **Format**: Markdown
- **Use**: Human-friendly summary, gaps analysis, and GitHub-issue formatted ticket

---

## 🚀 Viewing Reports

### Quick Commands

```bash
# List all available reports
npm run report:list

# Open the latest report automatically
npm run report:latest

# Open report selector (interactive)
npm run report
```

### Manual Viewing

#### Option 1: Using Playwright CLI
```bash
# From tests/e2e-test directory
npx playwright show-report ../../artifacts/playwright-report-e2e-2026-01-12T16-28-59
```

#### Option 2: Direct File Access
Open the HTML file directly in your browser:
```
C:\Users\ASUS\Documents\mereka-frontend-workspace-v2\artifacts\playwright-report-e2e-{timestamp}\index.html
```

---

## 🔧 Configuration

### Timestamped Reports (Default)

Timestamped reports are **enabled by default**. Each test run creates a new folder with a unique timestamp.

**Configuration** (in `playwright.config.ts`):
```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const reportFolder = process.env.TIMESTAMPED_REPORTS === 'false'
  ? '../../artifacts/playwright-report-e2e'
  : `../../artifacts/playwright-report-e2e-${timestamp}`;
```

### Disable Timestamped Reports

To disable timestamped reports (overwrites previous report):
```bash
TIMESTAMPED_REPORTS=false npm test
```

**⚠️ Warning**: This will overwrite the previous report. Use with caution.

---

## 📈 Report Features

### HTML Report Includes:
- ✅ **Test Summary**: Total tests, passed, failed, skipped
- ✅ **Test Details**: Individual test results with timing
- ✅ **Screenshots**: Captured on test failures
- ✅ **Videos**: Recorded for failed tests
- ✅ **Error Messages**: Full error stack traces
- ✅ **Execution Timeline**: Visual timeline of test execution
- ✅ **Filter Options**: Filter by status, project, file

### JUnit XML Includes:
- Test suite information
- Test case results
- Execution time
- Error messages
- Compatible with CI/CD tools (Jenkins, GitHub Actions, etc.)

### JSON Report Includes:
- Complete test results in structured format
- All test metadata
- Execution details
- Suitable for custom report generation

---

## 📝 Example Report Structure

```
artifacts/
├── playwright-report-e2e-2026-01-12T16-28-59/
│   ├── index.html          # Main report file
│   ├── data/
│   │   ├── attachments/     # Screenshots and videos
│   │   └── test-results.json
│   └── ...
├── test-results/
│   ├── junit-e2e.xml       # JUnit XML report
│   └── test-results-e2e.json # JSON report
```

---

## 🔍 Finding Latest Report

### Using PowerShell (Windows)
```powershell
Get-ChildItem -Path "artifacts" -Filter "playwright-report-e2e-*" -Directory | 
  Sort-Object LastWriteTime -Descending | 
  Select-Object -First 1
```

### Using npm script
```bash
npm run report:list
```

---

## 💡 Tips

1. **Keep Reports**: Timestamped reports allow you to compare test results over time
2. **Share Reports**: HTML reports are standalone - you can share the entire folder
3. **CI/CD Integration**: Use JUnit XML for automated test result reporting
4. **Debugging**: Check screenshots and videos in failed test reports
5. **History**: All reports are preserved, allowing you to track test stability

---

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run tests (generates timestamped report) |
| `npm run test:headed` | Run tests with browser visible |
| `npm run report:list` | List all available reports |
| `npm run report:latest` | Open latest report |
| `npm run report` | Open report selector |

---

## 📍 Report Locations Summary

- **HTML Reports**: `../../artifacts/playwright-report-e2e-{timestamp}/`
- **JUnit XML**: `../../artifacts/test-results/junit-e2e.xml`
- **JSON Report**: `../../artifacts/test-results/test-results-e2e.json`
- **Test Artifacts**: `test-results/` (screenshots, videos, error context)

---

**Note**: Reports are generated automatically after each test run. No manual generation needed!

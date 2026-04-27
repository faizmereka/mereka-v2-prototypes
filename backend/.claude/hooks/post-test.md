# Post-Test Hook

This hook runs automatically after test execution to provide insights and enforce coverage.

## Trigger

Executes after running tests (npm test, npm run test:coverage, /test command).

## Tasks

### 1. Coverage Analysis

- Parse coverage report (Istanbul/c8 format)
- Compare against thresholds (80%+)
- Identify files below threshold
- Generate coverage summary

### 2. Test Results Summary

- Total tests run
- Pass/fail breakdown
- Slowest tests (performance insights)
- Flaky test detection

### 3. Coverage Report

Generate human-readable report:

```
📊 Test Coverage Report
=======================
Lines:      75.5% ⚠️  (Target: 80%)
Functions:  82.3% ✅
Branches:   68.9% ⚠️  (Target: 80%)
Statements: 76.1% ⚠️  (Target: 80%)

📉 Files Below Threshold (5 files):
   1. src/core/services/booking.service.ts     62.3%
   2. src/modules/hub/controllers/hub.controller.ts   71.5%
   3. src/core/services/notification.service.ts 58.7%
   4. src/core/utils/validation.ts             65.2%
   5. src/core/services/analytics.service.ts   55.1%

💡 Suggestions:
   - Focus on booking.service.ts (largest gap)
   - Add edge case tests for error handling
   - Consider integration tests for analytics
```

### 4. Action Items

If coverage below threshold:

- List specific functions/lines missing coverage
- Suggest test scenarios to add
- Offer to generate test templates
- Block commit if critical (<60%)

### 5. Performance Insights

- Identify slow tests (>500ms)
- Suggest optimization opportunities
- Detect potential memory leaks in tests

## Auto-Actions

### Coverage Below 60% (Critical)

```
🚨 CRITICAL: Coverage below 60%
❌ Blocking commit until coverage improves

Required actions:
1. Run: npm run test:coverage
2. Add tests for uncovered files
3. Ensure coverage ≥60% before committing
```

### Coverage 60-79% (Warning)

```
⚠️  WARNING: Coverage below target (80%)
✅ Commit allowed, but please improve coverage

Recommended actions:
1. Review uncovered files list
2. Add tests for critical paths
3. Aim for 80%+ in next commit
```

### Coverage 80%+ (Good)

```
✅ Excellent coverage! (85.3%)
🎉 All thresholds met

Keep up the great work!
```

## Test Quality Metrics

Beyond coverage percentage:

- **Assertion density**: Avg assertions per test
- **Test isolation**: Detect shared state
- **Error coverage**: Are error paths tested?
- **Edge cases**: Boundary conditions covered?

## Integration with CI/CD

Results are formatted for:

- GitHub Actions (annotations)
- Terminal output (colored)
- Coverage badges (shields.io)
- Trend analysis (historical data)

## Example Output

```
🧪 Test Execution Complete
=========================

Tests:      127 passed, 0 failed (127 total)
Duration:   12.4s
Suites:     15

📊 Coverage Summary:
   Lines:      85.3% ✅
   Functions:  88.7% ✅
   Branches:   82.1% ✅
   Statements: 86.2% ✅

🏆 All coverage thresholds met!

⚡ Performance:
   Fastest:  auth.service.test.ts (142ms)
   Slowest:  hub.service.test.ts (1.2s) ⚠️

💡 Suggestions:
   - Consider splitting hub.service.test.ts
   - Add tests for new notification.service.ts
   - Review slow test in booking.routes.test.ts
```

## Configuration

Customize thresholds in `vitest.config.ts`:

```typescript
coverage: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80
}
```

## Bypass Coverage Check

For WIP branches only:

```bash
SKIP_COVERAGE=true npm test
```

**Note**: CI/CD will still enforce coverage.

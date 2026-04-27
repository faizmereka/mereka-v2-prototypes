# QA E2E Run Command

Run E2E tests for frontend-workspace-v2.

## Usage

```
/qa-e2e-run [feature]
```

## Examples

```
/qa-e2e-run              # Run all E2E tests
/qa-e2e-run auth         # Run authentication tests
/qa-e2e-run experience   # Run experience tests
```

## Tasks

1. Identify test files to run
2. Check frontend application availability
3. Set environment variables if needed
4. Execute E2E tests via Playwright
5. Generate test reports
6. Handle test failures
7. Provide execution summary

## Environment Configuration

- Check `FRONTEND_URL` environment variable
- Default: `https://v2.mereka.dev` (production)
- Can override: `FRONTEND_URL=http://localhost:4200`

## Output

- Test execution results
- Pass/fail summary
- Report location
- Debugging suggestions if failures

## Example

```
/qa-e2e-run auth

Runs: npx playwright test --config=tests/e2e-test/playwright.config.ts tests/e2e-test/tests/auth/
```

## Success Criteria

- Tests executed successfully
- Reports generated
- Clear summary provided
- Failures handled appropriately

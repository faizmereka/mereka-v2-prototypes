# QA E2E Generate Command

Generate E2E test file for a specific feature.

## Usage

```
/qa-e2e-generate <feature>
```

## Examples

```
/qa-e2e-generate login
/qa-e2e-generate registration
/qa-e2e-generate booking
```

## Tasks

1. Identify the feature from user input
2. Check existing E2E tests for similar features
3. Review feature structure in source code
4. Generate Playwright E2E test file
5. Create Page Object Model if needed
6. Add test cases for success scenarios
7. Add test cases for error scenarios
8. Use test fixtures
9. Follow E2E patterns

## Output

- Creates test file: `tests/e2e-test/tests/[feature]/[feature]-[scenario].spec.ts`
- Creates page object if needed: `tests/e2e-test/fixtures/[feature]-page.ts`
- Includes test cases
- Uses proper imports
- Follows project patterns

## Example

```
/qa-e2e-generate login

Generates: tests/e2e-test/tests/auth/auth-login.spec.ts
```

## Success Criteria

- Test file created in correct location
- Page Object Model created if needed
- Test cases for success and error scenarios
- Proper imports and structure
- Ready to run

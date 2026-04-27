# QA E2E Coverage Command

Analyze E2E test coverage for frontend-workspace-v2.

## Usage

```
/qa-e2e-coverage [feature]
```

## Examples

```
/qa-e2e-coverage              # Analyze all features
/qa-e2e-coverage auth         # Analyze authentication coverage
/qa-e2e-coverage experience   # Analyze experience coverage
```

## Tasks

1. Analyze E2E test files
2. Map tests to features
3. Compare with unit tests
4. Identify missing E2E tests
5. Calculate coverage percentages
6. Generate coverage report
7. Provide recommendations

## Output

- Coverage summary by feature
- Coverage summary by app
- Missing tests list
- Comparison with unit tests
- Priority recommendations
- Effort estimates

## Example

```
/qa-e2e-coverage auth

Analyzes authentication E2E test coverage
Compares with unit tests
Identifies gaps
```

## Success Criteria

- Coverage analysis complete
- Missing tests identified
- Recommendations provided
- Report generated

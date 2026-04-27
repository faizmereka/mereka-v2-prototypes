# Test Command

Run unit tests for an Angular project.

## Usage

```
/test [project-name]
```

## Arguments
- `$ARGUMENTS` - Optional project name (admin, web, app, auth, checkout)

## Actions

1. Run tests for the specified project
2. Report test results
3. Show coverage if available

## Commands

```bash
# Test specific project
ng test admin
ng test web
ng test app

# Test with coverage
ng test admin --code-coverage

# Test in CI mode (single run)
ng test admin --watch=false

# Test all projects
npm test
```

## Expected Output

- Test pass/fail status
- Number of tests run
- Coverage report (if enabled)

## Success Criteria

- All tests pass
- Coverage meets minimum threshold (80%+)

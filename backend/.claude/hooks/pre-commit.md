# Pre-Commit Hook

This hook runs automatically before creating git commits to ensure code quality.

## Trigger

Executes when you're about to make a commit (before running git commit).

## Tasks

### 1. Quick Validation

```bash
npm run check:fast
```

- Runs Biome lint in strict mode
- Runs Biome format check
- Runs TypeScript type checking
- Fast feedback (< 30 seconds)

### 2. Staged Files Check

- Verify no secrets in staged files
- Check import organization
- Validate file naming conventions
- Ensure no `console.log` statements

### 3. Run Affected Tests

- Run tests for modified files only
- Ensure changes don't break existing functionality
- Skip if no test files affected

### 4. Format Check

```bash
npm run format:check
```

- Verify Biome formatting
- Auto-fix if needed with `npm run format`

## Auto-Fix Flow

If validation fails:

1. Run `npm run lint:fix` to auto-fix linting issues
2. Run `npm run format` to format code
3. Re-run validation
4. If still failing, prevent commit and show errors

## Success Criteria

All checks must pass:

- ✅ Biome lint passes (0 errors)
- ✅ Biome format check passes
- ✅ TypeScript compiles (0 errors)
- ✅ No secrets detected
- ✅ Affected tests pass

## Example Output

```
🔍 Running pre-commit checks...

✅ Biome lint: 0 errors
✅ Biome format: Passed
✅ TypeScript: 0 errors
✅ Secrets scan: Clean
✅ Tests: 15 passed

✨ All checks passed! Ready to commit.
```

## Bypass (Use Sparingly)

To skip pre-commit hook in emergencies:

```bash
git commit --no-verify -m "emergency fix"
```

**WARNING**: Only use this for critical hotfixes. Always run full validation afterward.

## Configuration

Edit this file to customize:

- Change validation level
- Add custom checks
- Modify auto-fix behavior
- Configure test selection

# Pre-Commit Hook

This hook runs before committing code to ensure quality standards are met.

## Actions

1. **Lint Check**: Run ESLint to catch code issues
2. **Format Check**: Ensure code is properly formatted
3. **Type Check**: Verify TypeScript types are correct
4. **Build Check**: Ensure the project builds successfully

## Commands to Run

```bash
# Lint check
npm run lint

# Type check (Angular includes this in build)
ng build --configuration=development --dry-run

# Or run all checks
npm run lint && ng build --configuration=development --dry-run
```

## Validation Rules

Before committing, ensure:

1. No ESLint errors or warnings
2. All TypeScript types are correct
3. No console.log statements in production code (use proper logging)
4. All imports are organized (external first, then internal)
5. Component files follow Angular conventions:
   - Standalone components only
   - Use signals for state management
   - Use input()/output() instead of decorators
   - ChangeDetectionStrategy.OnPush

## Auto-fix

If issues are found, attempt to auto-fix:

```bash
npm run lint -- --fix
```

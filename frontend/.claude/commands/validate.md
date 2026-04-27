# Validate

Run all validation checks on the workspace.

## Steps

1. Run ESLint on all projects: `npm run lint`
2. Run TypeScript type checking: `npx tsc --noEmit`
3. Run unit tests: `npm test`
4. Check for build errors: `ng build --configuration=production`

## Commands to Run

```bash
npm run lint
npx tsc --noEmit
npm test -- --watch=false
```

Report any errors found and suggest fixes.

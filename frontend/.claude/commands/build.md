# Build Command

Build an Angular application for production.

## Usage

```
/build [project-name]
```

## Arguments
- `$ARGUMENTS` - Project name (admin, web, app, auth, checkout)

## Actions

1. Determine which project to build
2. Run production build
3. Check for build errors
4. Report bundle sizes

## Commands

```bash
# Build specific project
ng build admin --configuration=production
ng build web --configuration=production
ng build app --configuration=production
ng build auth --configuration=production
ng build checkout --configuration=production

# Build with source maps (for debugging)
ng build admin --configuration=production --source-map
```

## Expected Output

- Build success/failure status
- Bundle size analysis
- Any build warnings

## Success Criteria

- Build completes without errors
- Bundle sizes are within acceptable limits
- No TypeScript errors

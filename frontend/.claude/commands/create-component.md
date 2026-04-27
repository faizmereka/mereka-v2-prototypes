# Create Component

Create a new Angular component in the specified project.

## Arguments
- `$ARGUMENTS` - Component name and project (e.g., "dashboard --project=admin")

## Steps

1. Parse the component name and project from arguments
2. Run `ng generate component <name> --project=<project>`
3. If it's a shared component, add `--export` flag
4. Update the module/component exports if needed

## Example Usage
```
/create-component user-profile --project=app
/create-component button --project=ui --export
```

Generate the component using Angular CLI with standalone components (Angular 18+ default).

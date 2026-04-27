# Create Service

Create a new Angular service in the core library or specific project.

## Arguments
- `$ARGUMENTS` - Service name (e.g., "user" or "auth/token")

## Steps

1. Parse the service name from arguments
2. Run `ng generate service services/<name> --project=core`
3. Export the service from the library's public-api.ts
4. Add to the library's providers if needed

## Example Usage
```
/create-service user
/create-service auth/token
```

Services should be created in `@mereka/core` library for sharing across apps.

# Lint Command

Run linting to check for code quality issues.

## Usage

```
/lint [project-name]
```

## Arguments
- `$ARGUMENTS` - Optional project name (admin, web, app, auth, checkout)

## Actions

1. Run lint on the specified project or all projects
2. Report any errors or warnings
3. Suggest fixes if available

## Commands

```bash
# Lint specific project
ng lint admin
ng lint web
ng lint app

# Lint all projects
npm run lint

# Lint with auto-fix
ng lint admin --fix
```

## Expected Output

- List of any lint errors/warnings
- File locations and line numbers
- Suggested fixes

## Success Criteria

- Zero lint errors
- Warnings should be reviewed and addressed if possible

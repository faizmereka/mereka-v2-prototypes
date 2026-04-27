# Claude Code Configuration

This folder contains Claude Code configuration for the Mereka Frontend Workspace.

## Structure

```
.claude/
├── settings.json              # Permission settings
├── README.md                  # This file
│
├── commands/                  # Slash commands
│   ├── architecture.md        # /architecture - Show project structure
│   ├── build.md               # /build [project] - Build for production
│   ├── create-component.md    # /create-component - Generate component
│   ├── create-service.md      # /create-service - Generate service
│   ├── deploy.md              # /deploy [project] - Deploy to K8s
│   ├── lint.md                # /lint [project] - Run linting
│   ├── test.md                # /test [project] - Run unit tests
│   ├── validate.md            # /validate - Run all checks
│   ├── qa-e2e-generate.md     # NEW: /qa-e2e-generate - Generate E2E test
│   ├── qa-e2e-run.md          # NEW: /qa-e2e-run - Run E2E tests
│   └── qa-e2e-coverage.md     # NEW: /qa-e2e-coverage - E2E coverage
│
├── agents/                    # AI agents for code generation
│   ├── component-generator.md # Generate Angular components
│   ├── service-generator.md   # Generate Angular services
│   ├── page-generator.md      # Generate page components
│   ├── deployment-helper.md   # Kubernetes deployment helper
│   ├── qa-e2e-test-generator.md # NEW: Generate E2E tests
│   ├── qa-e2e-test-runner.md   # NEW: Run E2E tests
│   └── qa-e2e-coverage.md      # NEW: Analyze E2E coverage
│   ├── a11y-auditor.md        # Accessibility audit agent
│   ├── design-system.md       # Design system reference (tokens, BEM, conventions)
│   ├── style-reviewer.md      # Style audit for design system compliance
│   └── migrate-to-bem.md      # Migrate Tailwind components to BEM + SCSS
│
├── skills/                    # Specialized skills
│   ├── angular-modernization/ # /angular-modernization - Migrate to modern Angular
│   ├── reference-v1/          # /reference-v1 - Reference v1 legacy codebase
│   ├── reference-ssr/         # /reference-ssr - Reference SSR codebase patterns
│   └── skill-creator/         # /skill-creator - Create new skills
│
├── hooks/                     # Automation hooks
│   └── pre-commit.md          # Pre-commit validation
│
└── context/                   # Project context
    ├── projects/
    │   ├── admin.md           # Admin project context
    │   ├── auth.md            # Auth project context
    │   ├── web.md             # Web project context
    │   ├── app.md             # App project context
    │   └── checkout.md        # Checkout project context
    └── e2e-test-patterns.md   # NEW: E2E test patterns
```

## Custom Commands

### Development Commands

| Command | Description |
|---------|-------------|
| `/architecture` | Show project structure |
| `/build [project]` | Build project for production |
| `/create-component` | Generate new Angular component |
| `/create-service` | Generate new Angular service |
| `/deploy [project]` | Deploy to Kubernetes |
| `/lint [project]` | Run linting |
| `/test [project]` | Run unit tests |
| `/validate` | Run all quality checks |

### QA Testing Commands (NEW!)

| Command | Description |
|---------|-------------|
| `/qa-e2e-generate <feature>` | Generate E2E test for feature |
| `/qa-e2e-run [feature]` | Run E2E tests |
| `/qa-e2e-coverage [feature]` | Analyze E2E test coverage |
## Skills

| Skill | Description |
|-------|-------------|
| `/angular-modernization` | Migrate legacy Angular to modern patterns |
| `/reference-v1 [feature]` | Reference v1 legacy codebase (Firebase) |
| `/reference-ssr [component]` | Reference SSR codebase (Clean Architecture) |
| `/skill-creator` | Create new Claude Code skills |

## Projects

| Project | Port | Domain |
|---------|------|--------|
| admin | 4204 | admin.mereka.io |
| auth | 4201 | auth.mereka.io |
| web | 4200 | mereka.io |
| app | 4202 | app.mereka.io |
| checkout | 4203 | checkout.mereka.io |

## Permissions

Auto-approved commands:
- Angular CLI (`ng`)
- npm/npx commands
- Git operations
- File system operations
- kubectl commands

## QA Testing

### Test Types Overview

Frontend-workspace-v2 has two distinct test types:

| Test Type | Framework | Location | Purpose | Speed |
|-----------|-----------|----------|---------|-------|
| **Unit Tests** | Karma/Vitest | `src/**/*.spec.ts` | Component testing | ⚡ Fast |
| **E2E Tests** | Playwright | `tests/e2e-test/tests/` | User journey testing | 🐢 Slower |

### E2E Test Workflow

**Generate E2E Test**:
```
/qa-e2e-generate login
```
OR
```
Create an e2e test for login flow
```

**Run E2E Tests**:
```
/qa-e2e-run auth
```
OR
```
Run e2e tests for authentication
```

**Analyze Coverage**:
```
/qa-e2e-coverage authentication
```
OR
```
@qa-e2e-coverage-analyzer analyze authentication coverage
```

### Key Differences

**Unit Tests (Dev)**:
- Framework: Karma/Vitest
- Execution: In-process
- Frontend: Not required
- Speed: Fast
- Purpose: Component testing

**E2E Tests (QA)**:
- Framework: Playwright
- Execution: Browser automation
- Frontend: Required (running)
- Speed: Slower
- Purpose: User journey testing

### E2E Test Patterns

See `context/e2e-test-patterns.md` for:
- E2E test file structure
- Page Object Model patterns
- Selector patterns
- Error handling patterns

### Quick Reference

**Generate Test**: `/qa-e2e-generate <feature>`
**Run Tests**: `/qa-e2e-run [feature]`
**Coverage**: `/qa-e2e-coverage [feature]`
**Maintain Tests**: `@qa-e2e-test-maintainer`
**Analyze Coverage**: `@qa-e2e-coverage-analyzer`
**Generate Page Object**: `@qa-page-object-generator`

## Related Documentation

### QA Testing Documentation
- **QA Usage Guide**: `QA_USAGE_GUIDE.md` - Complete guide to QA agents, skills, and commands
- **E2E Test Patterns**: `context/e2e-test-patterns.md` - E2E test patterns and best practices
- **E2E Tests**: `tests/e2e-test/README.md` - E2E test documentation

## Usage

Claude Code will automatically read `CLAUDE.md` for project context and use these settings.

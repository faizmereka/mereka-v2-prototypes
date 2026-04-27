# Claude Code Configuration

This directory contains Claude Code-specific configurations for enhanced AI-assisted development.

**Version**: 4.1 Modular Service Architecture
**Status**: ✅ Fully Configured
**Last Updated**: December 3, 2025

## Project Architecture

This backend serves **5 frontend applications** using a **Core + Modules** architecture:

| App | Domain | Purpose |
|-----|--------|---------|
| Auth | auth.mereka.io | Authentication |
| Public | mereka.io | Public website |
| Checkout | checkout.mereka.io | Payment flow |
| Admin | admin.mereka.io | Administration |
| Main App | app.mereka.io | Primary app |

**See**: `docs/architecture/SERVICE-ARCHITECTURE.md` for full details.

## Directory Structure

```
.claude/
├── README.md              # This file
├── commands/              # Slash commands (10 commands)
│   ├── validate.md        # /validate - Run quality checks
│   ├── test.md            # /test - Run tests with coverage
│   ├── migrate.md         # /migrate - Firebase migration
│   ├── analyze.md         # /analyze - Project health
│   ├── fix.md             # /fix - Auto-fix issues
│   ├── api-test.md        # /api-test - Create HTTP tests
│   ├── architecture.md    # /architecture - Show architecture
│   ├── naming.md          # /naming - Naming conventions
│   ├── create-service.md  # /create-service - Create service
│   ├── create-module.md   # /create-module - Create module
│   └── create-feature.md  # /create-feature - Full stack feature
├── agents/                # Auto-invoked subagents (6 agents)
│   ├── template-validator.md
│   ├── schema-fixer.md
│   ├── deployment-helper.md
│   ├── test-enhancer.md
│   ├── api-tester.md
│   ├── dev-runner.md
│   └── backend-generator.md  # NEW: Backend code generation
├── skills/                # Manual skills (10 skills)
│   ├── firebase-analyzer/
│   ├── migration-generator/
│   ├── code-pattern-follower/
│   ├── api-tester/
│   ├── template-manager/
│   ├── seed-generator/
│   ├── schema-validator/
│   ├── kubernetes-helper/
│   ├── stripe-helper/
│   └── test-coverage-enhancer/
├── hooks/                 # Automated hooks (3 hooks)
│   ├── pre-commit.md
│   ├── post-test.md
│   └── pre-migration.md
└── context/               # Context files (2 files)
    ├── project-context.md
    └── workflows.md
```

## ⚡ Quick Reference

### Code Generation Commands (4) - NEW!

| Command | Purpose | Example |
|---------|---------|---------|
| `/architecture` | Show project architecture & folder structure | `/architecture` |
| `/naming` | File & class naming conventions | `/naming` |
| `/create-service` | Create service following patterns | `/create-service booking` |
| `/create-feature` | Full stack: service + controller + routes | `/create-feature booking` |

### Quality Commands (6)

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/validate` | Run all quality checks | Before commits |
| `/test` | Analyze test coverage | After changes |
| `/fix` | Auto-fix lint/format issues | When issues found |
| `/analyze` | Project health analysis | Weekly |
| `/migrate <name>` | Firebase to MongoDB | Migration |
| `/api-test <name>` | Create HTTP test files | After new APIs |

### Auto-Invoked Agents (6) ⚡

Claude automatically uses these when appropriate:

| Agent | Trigger | Purpose |
|-------|---------|---------|
| **backend-generator** | "create API", "add endpoint" | Generate service/controller/routes |
| **template-validator** | Template changes | Validate email/notification templates |
| **schema-fixer** | JSON Schema errors | Fix schema issues in routes |
| **deployment-helper** | K8s/deploy mentions | Handle deployments |
| **test-enhancer** | Low coverage | Create tests for 80%+ coverage |
| **dev-runner** | "run", "start dev" | Start local dev environment |

### Manual Skills (10)

Use with `@skill-name`:

- **@firebase-analyzer** - Analyze Firebase structure
- **@migration-generator** - Generate complete module
- **@code-pattern-follower** - Ensure consistency
- **@api-tester** - Create comprehensive tests
- **@template-manager** - Manage email/notification templates
- **@seed-generator** - Generate database seed scripts
- **@schema-validator** - Validate and fix JSON schemas
- **@kubernetes-helper** - Manage K8s deployments
- **@stripe-helper** - Handle Stripe payments & webhooks
- **@test-coverage-enhancer** - Improve test coverage to 80%+

## Service Architecture Quick Reference

### Import Paths

```typescript
// Services
import { adminJobService } from '@services/admin';
import { hubContractService } from '@services/hub';
import { experienceService } from '@services/web';
import { authService, stripeService } from '@services/shared';

// Controllers (in routes)
import { listJobs } from '@controllers/admin';
import { createContract } from '@controllers/hub';

// Routes (in module index)
import { adminJobRoutes } from '@routes/admin';
import { hubContractRoutes } from '@routes/hub';
```

### File Locations

| Type | Admin | Hub | Web |
|------|-------|-----|-----|
| **Services** | `core/services/admin/{domain}/` | `core/services/hub/{domain}/` | `core/services/web/{domain}/` |
| **Controllers** | `modules/admin/controllers/{domain}/` | `modules/hub/controllers/{domain}/` | `modules/web/controllers/` |
| **Routes** | `modules/admin/routes/{domain}/` | `modules/hub/routes/{domain}/` | `modules/web/routes/` |

### Naming Conventions

| App | Service File | Service Class | Prefix |
|-----|--------------|---------------|--------|
| Admin | `adminJob.service.ts` | `AdminJobService` | `admin*` |
| Hub | `hubContract.service.ts` | `HubContractService` | `hub*` |
| Web | `job.service.ts` | `JobService` | (none) |
| Shared | `auth.service.ts` | `AuthService` | (none) |

## Creating New Features

### Quick Workflow

1. **Decide module**: admin, hub, web, or shared
2. **Run command**: `/create-feature {name}`
3. **Follow prompts**: Creates service → controller → routes → tests
4. **Verify**: `npm run type-check`

### Manual Creation Order

```
1. Service    → core/services/{module}/{domain}/{name}.service.ts
2. Controller → modules/{module}/controllers/{domain}/{name}.controller.ts
3. Routes     → modules/{module}/routes/{domain}/{name}.routes.ts
4. Register   → modules/{module}/index.ts
5. Tests      → tests/unit/modules/{module}/{name}.service.test.ts
```

## Best Practices

1. **Use commands**: `/create-feature` ensures correct patterns
2. **Follow naming**: `/naming` for file/class conventions
3. **Validate often**: `/validate` before commits
4. **Check architecture**: `/architecture` when unsure about structure
5. **Run type check**: `npm run type-check` after changes

## Related Documentation

- `docs/architecture/SERVICE-ARCHITECTURE.md` - Complete architecture guide
- `docs/architecture/MULTI-APP-ARCHITECTURE.md` - Multi-app overview
- `CLAUDE.md` - Main project instructions

---

_Last updated: December 3, 2025_

# Build Strategy and Architecture

> Production-grade build system for a single backend service

---

## Overview

This project uses a **simplified two-step build** approach without monorepo complexity.

### Build Steps

```
Step 1: TypeScript Declarations  →  dist/types/*.d.ts
Step 2: JavaScript Bundle         →  dist/js/*.js
```

---

## 1) TypeScript Configuration (Strict Mode)

### Three TypeScript Configs

**`tsconfig.json`** (Editor + Type Checking)
- `noEmit: true` - No output, just checking
- Includes all source files and tests
- Strict mode enabled
- Path aliases configured

**`tsconfig.build.json`** (Build - Declarations)
- Extends `tsconfig.json`
- `noEmit: false` - Emits declarations
- `declarationDir: dist/types`
- `rootDir: src` - Only source files
- Excludes tests

**`tsconfig.runtime.json`** (Runtime Execution with tsx)
- For running scripts with `tsx`
- Maps paths to `dist/js/` instead of `dist/types/`
- Used by database seeds, migration scripts

### Strict TypeScript Settings
```json
{
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "useUnknownInCatchVariables": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "verbatimModuleSyntax": true
}
```

---

## 2) Build Process

### Development Build
```bash
npm run build
```

Runs:
1. `npm run build:types` - TypeScript compiler (`tsc`)
2. `npm run build:js` - tsup bundler (esbuild)

### Production Build
```bash
npm run build:prod
```

Sets `NODE_ENV=production` and runs full build with minification.

### Watch Mode (Development)
```bash
npm run dev
```

Runs tsup in watch mode, auto-rebuilds and restarts server on changes.

---

## 3) Module System (ESM Only)

**ESM Everywhere:**
- `"type": "module"` in package.json
- All imports use `import/export`
- NO CommonJS (`require`, `module.exports`)
- Node.js built-ins use `node:` protocol

```typescript
// ✅ CORRECT
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// ❌ WRONG
const fs = require('fs');
import fs from 'fs';  // Missing node: protocol
```

---

## 4) Import Path Standards

### Use Path Aliases (Always)
```typescript
// ✅ CORRECT (Core + Modules Architecture)
import type { IUser } from '@core/models/User';
import { UserService } from '@core/services/user.service';
import { env } from '@core/config/env';

// ❌ WRONG
import { IUser } from '../../core/models/User';
import { UserService } from '../core/services/user.service';
```

### Import Organization (Biome Enforced)
```typescript
// 1. Node.js built-ins
import fs from 'node:fs';
import path from 'node:path';

// 2. External dependencies
import { z } from 'zod';
import mongoose from 'mongoose';
import type { FastifyInstance } from 'fastify';

// 3. Internal imports - Core layer (business logic)
import type { IUser } from '@core/models/User';
import { UserService } from '@core/services/user.service';
import { createUserSchema } from '@core/schemas/user.schema';

// 4. Internal imports - Modules layer (HTTP) - if in a controller
import { userController } from '@modules/web/controllers/user.controller';

// 5. Relative imports (avoid if possible)
import { helper } from './utils';
```

### Extensionless Imports
```typescript
// ✅ CORRECT - No extensions in TypeScript
import { User } from '@core/models/User';
import { helper } from './utils';

// ❌ WRONG - Don't add .ts or .js extensions
import { User } from '@core/models/User.ts';
import { helper } from './utils.js';
```

---

## 5) Validation & Quality Gates

### Before Every Commit
```bash
npm run check
```

This runs (in order):
1. Biome lint (strict mode)
2. Biome format check
3. TypeScript type checking
4. All tests
5. Import path validation
6. Export validation
6. Code quality checks
7. Secret scanning
8. Environment validation

### Fast Check (During Development)
```bash
npm run check:fast
```

Runs only lint and type-check for quick feedback.

### Validation Scripts

**`validate-all.mjs`** - Orchestrates all checks
**`validate-imports.mjs`** - Prevents deep imports and circular deps
**`validate-exports.mjs`** - Ensures dist-only exports
**`scan-secrets.mjs`** - Detects exposed secrets
**`validate-code-quality.mjs`** - Checks code standards

---

## 6) Testing Strategy (80%+ Coverage Required)

### Test Structure
```
tests/
├── unit/           # Service tests (fast, isolated)
├── integration/    # API tests (with DB)
├── e2e/            # End-to-end flows
├── fixtures/       # Test data
└── setup.ts        # Global setup/teardown
```

### Running Tests
```bash
npm test                 # All tests
npm run test:watch       # Watch mode
npm run test:unit        # Unit only
npm run test:integration # Integration only
npm run test:coverage    # With coverage report
```

### Coverage Requirements
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 80%+

---

## 7) Development Workflow

### Daily Loop
```bash
# 1. Start development
npm run dev

# 2. Make changes (code, tests together)

# 3. Quick validation
npm run check:fast

# 4. Run relevant tests
npm test -- user.service

# 5. Full check before commit
npm run check

# 6. Commit
git add .
git commit -m "feat: add user module"
```

### Clean Build (When Things Break)
```bash
# 1. Clean everything
npm run clean

# 2. Reinstall
npm install

# 3. Build from scratch
npm run build

# 4. Verify
npm run check
```

---

## 8) Git Hooks (Husky)

### pre-commit
Automatically runs on `git commit`:
- lint-staged (Biome check --write on changed files)
- Fast validation and auto-fixing of staged files

### pre-push (Recommended)
Add this hook for extra safety:
- Run `npm run check:fast`
- Prevent pushing broken code

---

## 9) CI/CD Pipeline

### Minimum CI Checks
```yaml
1. Install dependencies
2. Run linting (npm run lint)
3. Run type checking (npm run type-check)
4. Run tests (npm test)
5. Run validation (npm run validate:all)
6. Build (npm run build)
```

### Deployment Build
```bash
npm run build:prod
```

Outputs production-ready code with:
- Minified JS
- Source maps
- Type declarations
- Optimized bundles

---

## 10) Error Messages & Diagnostics

### Build Failures

**"Cannot find module '@models/User'"**
- Run `npm run build:types` first
- Restart your IDE/editor
- Check path aliases in `tsconfig.json`

**"Module not found: Can't resolve"**
- Run `npm run build`
- Check imports are correct
- Verify file exists

**"Type error in dist/"**
- Run `npm run clean`
- Run `npm run build` again
- Check for circular dependencies

---

## 11) Performance Tips

### Fast Development Loop
```bash
# Only rebuild what changed
npm run dev  # Watch mode handles this

# Skip full validation during iteration
npm run check:fast  # Instead of npm run check

# Run specific tests
npm test -- user  # Only user-related tests
```

### Build Speed
- **First build**: ~30-60 seconds
- **Incremental**: ~5-10 seconds  
- **Watch mode**: <1 second (hot reload)

---

## 12) Best Practices

### When Creating New Files
1. Use correct naming convention
2. Add to appropriate folder
3. Use path aliases for imports
4. Add JSDoc documentation
5. Write tests immediately
6. Run `npm run check:fast`

### When Refactoring
1. Run `npm run validate:imports` after moving files
2. Check for circular dependencies
3. Update tests
4. Run full `npm run check`

### When Debugging
1. Check `npm run env:doctor` first
2. Look at logs (structured logging)
3. Run specific validation scripts
4. Use `npm run check:fast` frequently

---

## 13) Quality Gates

All enforced via Biome + TypeScript:

✅ No `any` types  
✅ No unsafe operations  
✅ Consistent type imports  
✅ Organized imports with newlines  
✅ No circular dependencies  
✅ No floating promises  
✅ Proper error handling  
✅ 80%+ test coverage  
✅ No exposed secrets  
✅ Valid environment config  

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Watch mode
npm start                # Production

# Validation
npm run check            # Full validation
npm run check:fast       # Quick check
npm run lint             # Biome lint
npm run format:check     # Biome format check
npm run check:biome      # Combined Biome check
npm run type-check       # TypeScript

# Testing
npm test                 # All tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage

# Build
npm run build            # Full build
npm run build:types      # Types only
npm run build:js         # JS only
npm run clean            # Clean artifacts

# Utilities
npm run env:doctor       # Env diagnostics
npm run validate:all     # All validators
npm run verify:secrets   # Secret scan
```

---

**This is the authoritative build guide. Follow it strictly.**


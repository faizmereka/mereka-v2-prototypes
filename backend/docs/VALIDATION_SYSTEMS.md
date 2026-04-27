# Validation Systems

> Quality gates for comprehensive validation infrastructure

---

## Overview

This project enforces **professional quality standards** through automated validation scripts. Every check exists to prevent code quality drift and maintain consistency.

---

## Day-to-Day Workflow

### Fast Iteration
```bash
# During development
npm run dev              # Auto-reload on changes
npm run check:fast       # Quick lint + type-check
npm test -- user         # Specific tests
```

### Before Committing
```bash
npm run check            # MUST PASS
```

This is **non-negotiable**. Running `npm run check` ensures:
- ✅ Code compiles
- ✅ All tests pass
- ✅ No linting errors
- ✅ No type safety violations
- ✅ No import violations
- ✅ No exposed secrets
- ✅ Environment is valid

---

## Validation Scripts

### 1. `validate-all.mjs`
**Purpose**: Orchestrate all validation checks

**Runs**:
1. TypeScript type checking
2. Biome lint (strict mode)
3. Biome format check
4. Import validation
5. Export validation
6. Code quality checks
7. Environment validation
8. Secret scanning

**Usage**:
```bash
npm run validate:all
```

**Output**:
```
⏳ TypeScript Type Check... ✅
⏳ Biome Lint... ✅
⏳ Biome Format Check... ✅
⏳ Import Validation... ✅
⏳ Export Validation... ✅
⏳ Code Quality... ✅
⏳ Environment Validation... ✅
⏳ Secret Scanning... ✅

==================================================
✅ Passed: 8
⚠️  Warnings: 0
❌ Failed: 0
==================================================

✅ All validations passed!
```

---

### 2. `validate-imports.mjs`
**Purpose**: Prevent deep imports and enforce import boundaries

**Checks**:
- ❌ No imports from `dist/`
- ❌ Max 2 levels of `../` (prefer path aliases)
- ❌ No circular dependencies (future)

**Usage**:
```bash
npm run validate:imports
```

**Example Violations**:
```typescript
// ❌ WRONG
import { User } from '@/dist/models/User';
import { helper } from '../../../utils/helper';

// ✅ CORRECT
import { User } from '@models/User';
import { helper } from '@utils/helper';
```

---

### 3. `validate-exports.mjs`
**Purpose**: Ensure all exports point to dist/ not src/

**Checks**:
- package.json exports don't reference src/
- dist/types/ exists (build artifacts)
- dist/js/ exists (build artifacts)

**Usage**:
```bash
npm run validate:exports
```

---

### 4. `scan-secrets.mjs`
**Purpose**: Detect exposed secrets before committing

**Scans For**:
- AWS Access Keys
- Private Keys
- API Keys
- JWT Tokens
- MongoDB Connection Strings with passwords

**Usage**:
```bash
npm run verify:secrets
```

**Example Violation**:
```typescript
// 🚨 DETECTED
const apiKey = 'sk_live_REDACTED...';

// ✅ CORRECT
const apiKey = process.env.API_KEY;
```

---

### 5. `validate-code-quality.mjs`
**Purpose**: Enforce code organization standards

**Checks**:
- No duplicate test files
- Tests in proper locations (tests/ or __tests__/)
- Required files exist (.env.example, README.md)
- Proper file naming conventions

**Usage**:
```bash
npm run verify:code-quality
```

---

### 6. `validate-env.mjs`
**Purpose**: Validate environment configuration

**Checks**:
- .env.example exists
- All required variables are documented
- .env file exists (with warning if missing)
- Variables from .env.example are present

**Usage**:
```bash
npm run env:validate
```

---

### 7. `env-doctor.mjs`
**Purpose**: Comprehensive environment diagnostics

**Checks**:
- Node.js version (>=20.11)
- Package manager installed
- MongoDB connection configured
- Environment files exist
- Critical variables present
- TypeScript configuration
- Build artifacts

**Usage**:
```bash
npm run env:doctor
```

**Sample Output**:
```
🏥 Running Environment Doctor...
============================================================

📦 Node.js Version
   Current: v20.11.0
   ✅ Meets requirement (>=20.11)

📦 Package Manager
   npm: 10.2.4 ✅

🗄️  MongoDB
   URI configured: ✅
   mongodb://***:***@localhost:27017/mereka_dev

📄 Environment Files
   .env.example: ✅
   .env: ✅

   Critical variables:
   MONGODB_URI: ✅
   JWT_SECRET: ✅
   NODE_ENV: ✅

🔧 TypeScript Configuration
   tsconfig.json: ✅
   tsconfig.build.json: ✅

📦 Build Artifacts
   dist/: ✅ Exists
   dist/types/: ✅
   dist/js/: ✅

============================================================

✅ Environment doctor check complete
```

---

## Integration with Development

### Pre-commit Hook
Automatically runs on `git commit`:
```bash
lint-staged  # Biome check --write on changed files
```

### Recommended Pre-push Hook
Add to `.husky/pre-push`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run check:fast
```

---

## CI/CD Integration

### Minimum CI Pipeline
```yaml
steps:
  - name: Install
    run: npm ci
    
  - name: Validate Environment
    run: npm run env:validate
    
  - name: Lint
    run: npm run lint
    
  - name: Type Check
    run: npm run type-check
    
  - name: Test
    run: npm test
    
  - name: Build
    run: npm run build
    
  - name: Validate All
    run: npm run validate:all
```

### Full CI Pipeline (Recommended)
```bash
npm run check  # Runs everything
```

---

## Troubleshooting

### Validation Failed

**TypeScript errors:**
```bash
npm run type-check  # See specific errors
```

**Biome lint errors:**
```bash
npm run lint        # See errors
npm run lint:fix    # Auto-fix when possible
```

**Import violations:**
```bash
npm run validate:imports  # See violations
# Fix: Use path aliases instead of relative imports
```

**Test failures:**
```bash
npm run test:watch  # Run specific failing tests
```

**Secrets detected:**
```bash
npm run verify:secrets  # See what was detected
# Fix: Move to environment variables
```

---

## Best Practices

### 1. Run Checks Frequently
```bash
# After any significant change
npm run check:fast

# Before committing
npm run check
```

### 2. Fix Issues Immediately
Don't accumulate technical debt. Fix validation errors as they appear.

### 3. Understand Failures
Read the error messages. They provide specific guidance on how to fix issues.

### 4. Use Automation
Let pre-commit hooks catch issues early.

---

## Quality Metrics

### Thresholds (Enforced)
- **Test Coverage**: ≥80%
- **Type Safety**: 100% (no any, no unsafe operations)
- **Biome Lint Violations**: 0
- **Exposed Secrets**: 0

### Performance Budgets
- **Type Check**: <30 seconds
- **Lint**: <15 seconds
- **Unit Tests**: <10 seconds
- **Full Check**: <2 minutes

---

## Scripts Reference

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `check` | Full validation | Before every commit |
| `check:fast` | Quick validation | During development |
| `validate:all` | All validators | Part of `check` |
| `validate:imports` | Import paths | After refactoring |
| `validate:exports` | Export config | After build changes |
| `verify:secrets` | Secret scan | Before commit (auto) |
| `verify:code-quality` | Code standards | Periodically |
| `env:validate` | Environment | When env changes |
| `env:doctor` | Full diagnostics | When troubleshooting |

---

## Integration with Editors

### VS Code
Add to `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

---

**Quality is non-negotiable. These validations ensure production-grade code.**


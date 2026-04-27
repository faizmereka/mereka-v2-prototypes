# Claude Code - Complete Setup Guide

**Date**: November 7, 2025
**Status**: ✅ Fully Configured & Production-Ready
**Version**: 2.0 (Enhanced with Hooks, Skills & Context)

---

## 🎉 What's New (Version 2.0)

### Added Features

- ✅ **3 Automated Hooks** (pre-commit, post-test, pre-migration)
- ✅ **4 Specialized Skills** (Firebase analyzer, migration generator, pattern follower, API tester)
- ✅ **2 Context Files** (project context, workflows)
- ✅ **Enhanced claude.json** (comprehensive configuration)
- ✅ **67+ HTTP Test Files** (manual API testing)
- ✅ **6 Slash Commands** (quick actions)

---

## 📂 Complete Directory Structure

```
.claude/
├── README.md                          # Quick reference
├── commands/                          # Slash commands (6)
│   ├── validate.md                    # /validate
│   ├── test.md                        # /test
│   ├── migrate.md                     # /migrate
│   ├── analyze.md                     # /analyze
│   ├── fix.md                         # /fix
│   └── api-test.md                    # /api-test
├── skills/                            # Specialized agents (4)
│   ├── firebase-analyzer/
│   │   └── skill.md
│   ├── migration-generator/
│   │   └── skill.md
│   ├── code-pattern-follower/
│   │   └── skill.md
│   └── api-tester/
│       └── skill.md
├── hooks/                             # Automated hooks (3)
│   ├── pre-commit.md
│   ├── post-test.md
│   └── pre-migration.md
└── context/                           # Context files (2)
    ├── project-context.md
    └── workflows.md

tests/http/                            # HTTP test files (5)
├── README.md
├── auth.http
├── learner-profile.http
├── hub-profile.http
├── subscription.http
└── reference-data.http

claude.json                            # Main configuration
```

---

## 🚀 Quick Start

### 1. Verify Installation

```bash
# Check Claude Code is installed
claude --version

# Check project configuration
cat claude.json
```

### 2. Test Slash Commands

```
/validate              # Should run npm run check
/analyze               # Should provide project health report
```

### 3. Test HTTP Files

```
1. Install "REST Client" extension in VS Code
2. Open tests/http/auth.http
3. Click "Send Request" above any endpoint
4. Verify response
```

### 4. Start Development

```bash
npm run dev            # Start server
# Then use HTTP files to test APIs
```

---

## 📋 Features Overview

### 1. Slash Commands (6 Total)

#### `/validate`

**Purpose**: Run all quality checks before commit
**When**: Before every commit

```
/validate
```

**What it does**:

- Runs `npm run check`
- Biome lint strict mode
- TypeScript type checking
- All tests
- Import/export validation
- Secret scanning

**Output**:

```
🔍 Running validation...

✅ Biome Lint: 0 errors
✅ TypeScript: 0 errors
✅ Tests: 127 passed
✅ Secrets scan: Clean
✅ Imports: Valid
✅ Exports: Valid

✨ All checks passed!
```

#### `/test`

**Purpose**: Analyze test coverage
**When**: After code changes

```
/test
```

**What it does**:

- Runs `npm run test:coverage`
- Analyzes coverage report
- Identifies gaps (<80%)
- Lists untested files
- Offers to create tests

**Output**:

```
📊 Test Coverage Report

Coverage:
  Lines:      75.5% ⚠️  (Target: 80%)
  Functions:  82.3% ✅
  Branches:   68.9% ⚠️
  Statements: 76.1% ⚠️

Files Below Threshold (5):
  1. src/services/booking.service.ts     62.3%
  2. src/controllers/hub.controller.ts   71.5%
  ...

💡 Would you like me to create tests for these files? (y/n)
```

#### `/migrate <collection>`

**Purpose**: Migrate Firebase collection to MongoDB
**When**: For Firebase migrations

```
/migrate experiences
```

**What it does**:

1. Analyzes Firebase structure
2. Creates Mongoose model
3. Creates Zod schemas
4. Creates service
5. Creates controller
6. Creates routes
7. Generates tests
8. Runs validation

**Output**:

```
🔍 Analyzing Firebase collection: experiences...

✅ Analysis complete
   - 18 fields identified
   - 3 relationships detected
   - 2 enums found
   - Complexity: MEDIUM

🏗️  Generating code...

✅ Created src/models/Experience.ts
✅ Created src/schemas/experience.schema.ts
✅ Created src/services/experience.service.ts
✅ Created src/controllers/experience.controller.ts
✅ Created src/routes/experience.routes.ts
✅ Created tests/unit/experience.service.test.ts
✅ Created tests/integration/experience.routes.test.ts

✅ Updated src/app.ts

🧪 Running validation...
✅ All checks passed!

📊 Test coverage: 87.3%

✅ Migration complete!
```

#### `/analyze`

**Purpose**: Project health analysis
**When**: Weekly or before releases

```
/analyze
```

**What it does**:

- Code quality analysis
- Test coverage review
- Security scanning
- Performance review
- Provides recommendations

**Output**:

```
📊 Project Health Report

Code Quality: ✅ Excellent (95/100)
Test Coverage: ⚠️  Below target (75%)
Security: ✅ No issues
Performance: ✅ Good

Critical Issues: 0
Warnings: 3
Recommendations: 5

🔧 Top Recommendations:
1. Improve test coverage (target: 80%+)
2. Add unit tests for booking.service.ts
3. Optimize hub queries with indexes

Would you like detailed analysis? (y/n)
```

#### `/fix`

**Purpose**: Auto-fix common issues
**When**: Linting/formatting errors

```
/fix
```

**What it does**:

- Runs `npm run lint:fix`
- Runs `npm run format`
- Organizes imports
- Fixes common type errors

**Output**:

```
🔧 Auto-fixing issues...

✅ Fixed 12 linting errors
✅ Formatted 8 files
✅ Organized imports in 5 files
✅ No new issues introduced

Running validation...
✅ All checks pass!
```

#### `/api-test <feature>`

**Purpose**: Create HTTP test files
**When**: After creating new APIs

```
/api-test booking
```

**What it does**:

- Identifies all endpoints for feature
- Creates `.http` file
- Adds authentication examples
- Documents expected responses

**Output**:

```
Creating HTTP test file for: booking

Found endpoints:
  - POST /api/v1/bookings
  - GET /api/v1/bookings
  - GET /api/v1/bookings/:id
  - PATCH /api/v1/bookings/:id
  - DELETE /api/v1/bookings/:id

✅ Created tests/http/booking.http

File includes:
  - 5 endpoints with examples
  - Authentication headers
  - Request payloads
  - Expected responses
  - Error scenarios

Use VS Code REST Client to test!
```

---

### 2. Automated Hooks (3 Total)

#### Pre-Commit Hook

**Trigger**: Before git commit
**Auto-runs**: Yes

**Checks**:

- ✅ Biome lint (fast mode)
- ✅ TypeScript types
- ✅ Affected tests
- ✅ No secrets
- ✅ Proper formatting

**Auto-fix**:

- Runs `lint:fix` if needed
- Runs `format` if needed
- Re-validates

**Example**:

```bash
git commit -m "feat: add booking"

# Hook runs automatically:
🔍 Pre-commit validation...

✅ Lint: 0 errors (auto-fixed 3)
✅ Types: 0 errors
✅ Tests: 15 passed
✅ Secrets: Clean
✅ Format: Passed

✨ Ready to commit!
```

#### Post-Test Hook

**Trigger**: After running tests
**Auto-runs**: Yes

**Reports**:

- 📊 Coverage summary
- 🏆 Pass/fail breakdown
- ⚡ Performance insights
- 💡 Suggestions

**Example**:

```bash
npm test

# Tests run...

# Hook runs after:
📊 Test Coverage Report
=======================

Tests: 127 passed, 0 failed (127 total)
Duration: 12.4s

Coverage:
  Lines:      85.3% ✅
  Functions:  88.7% ✅
  Branches:   82.1% ✅
  Statements: 86.2% ✅

🏆 All thresholds met!

⚡ Slowest test: hub.service.test.ts (1.2s)

💡 Suggestions:
   - Consider splitting hub.service.test.ts
   - Add tests for notification.service.ts
```

#### Pre-Migration Hook

**Trigger**: Before `/migrate` command
**Auto-runs**: Yes

**Checks**:

- ✅ MongoDB connected
- ✅ Firebase configured
- ✅ Build up to date
- ✅ Tests passing
- ✅ Clean git status
- ✅ Dependencies exist

**Example**:

```
/migrate experiences

# Hook runs first:
🔍 Pre-Migration Validation
===========================

Environment:
  ✅ MongoDB: Connected
  ✅ Firebase: Configured
  ✅ Build: Up to date

Dependencies:
  ✅ User model: Exists
  ✅ Hub model: Exists
  ✅ Reference data: Seeded

Git Status:
  ✅ Branch: feature/migrate-experiences
  ✅ Changes: Clean

Safety:
  ✅ Not on main branch
  ⚠️  No backup detected

⚠️  Recommendation: Create backup before migrating

Proceed? (y/n)
```

---

### 3. Specialized Skills (4 Total)

#### @firebase-analyzer

**Purpose**: Analyze Firebase collection structure

**Input**:

- Collection name
- Firebase export file (optional)

**Output**:

- Field mapping document
- Relationship diagram
- Migration complexity assessment
- Data transformation requirements
- Recommended indexes
- Business rules detected

**Example**:

```
Analyzing Firebase collection: experiences

✅ Analysis Complete!

Fields: 18
Relationships: 3 (User, Hub, FocusArea)
Enums: 2 (type, status)
Complexity: MEDIUM
Est. time: 15-20 minutes

📄 Full analysis: docs/migrations/experiences-analysis.md
```

#### @migration-generator

**Purpose**: Generate complete module from analysis

**Input**:

- Collection name
- Analysis document

**Output**:

- Mongoose model
- Zod schemas
- Service layer
- Controller layer
- Routes
- Unit tests
- Integration tests

**Example**:

```
Generating migration for: experiences

✅ Created 7 files (1,812 lines)
✅ All files follow User module pattern
✅ Biome Lint: 0 errors
✅ TypeScript: 0 errors
✅ Tests: 63 passed
✅ Coverage: 87.3%

Ready to use!
```

#### @code-pattern-follower

**Purpose**: Ensure code consistency

**Input**:

- Module to validate
- Reference module (User)

**Output**:

- Compliance report
- Violation details
- Auto-fix options

**Example**:

```
Validating Experience module against User pattern...

✅ Compliant: 8/10 checks

❌ Violations:
  1. Logging inconsistent (src/controllers/experience.controller.ts:45)
  2. Missing Swagger description (src/routes/experience.routes.ts:23)

📊 Compliance: 80%

Would you like to auto-fix? (y/n)
```

#### @api-tester

**Purpose**: Create comprehensive tests

**Input**:

- Module name
- Source files

**Output**:

- Unit test file (80%+ coverage)
- Integration test file (all endpoints)
- Test fixtures

**Example**:

```
Creating tests for: Experience module

✅ Created tests/unit/experience.service.test.ts (28 tests)
✅ Created tests/integration/experience.routes.test.ts (35 tests)

Running tests...
✅ All passed (63/63)

Coverage: 90.4% ✅
```

---

### 4. Context Files (2 Total)

#### project-context.md

**Purpose**: Essential project context

**Contains**:

- Project identity
- Core technologies
- Architecture pattern
- Code standards
- Naming conventions
- Reference implementation
- Common pitfalls

**Auto-loaded**: Yes (when enabled in claude.json)

#### workflows.md

**Purpose**: Common development workflows

**Contains**:

- New feature development
- Bug fix workflow
- Testing workflow
- Migration workflow
- Deployment workflow
- Quick fixes
- Emergency procedures

**Auto-loaded**: Yes

---

### 5. HTTP Test Files (67+ Endpoints)

#### auth.http

**Endpoints**: 9

- Register, Login, Social login
- Token refresh, Get current user
- Change password, Forgot/reset password
- User status check

#### learner-profile.http

**Endpoints**: 4

- Get profile, Update profile
- Update slug, Check slug availability

#### hub-profile.http

**Endpoints**: 4

- Get hub, Create hub
- Update hub, Submit for approval
- Multi-step onboarding flow

#### subscription.http

**Endpoints**: 5

- Get plans, Create checkout session
- Verify payment, Get user subscriptions
- Stripe webhooks

#### reference-data.http

**Endpoints**: 45+

- 9 collections with full CRUD
- Focus Areas, Amenities, Facilities
- Skills, Job Preferences, Languages
- Space Types, Experience Types, Company Types

---

## 🎯 Usage Examples

### Example 1: Creating New Feature

```
1. Plan feature
2. /migrate bookings (if from Firebase)
   OR create manually following User module
3. /validate (ensure quality)
4. /test (check coverage)
5. /api-test bookings (create HTTP tests)
6. Manual testing with HTTP file
7. git commit (pre-commit hook runs)
8. git push
```

### Example 2: Bug Fix

```
1. Write failing test
2. Fix bug
3. /test (verify fix + coverage)
4. /validate (full validation)
5. git commit (hook validates)
```

### Example 3: Code Review

```
1. /analyze (get health report)
2. Use @code-pattern-follower skill
3. /validate (check quality)
4. Review recommendations
5. Fix issues
6. /validate again
```

---

## 📊 Quality Enforcement

### Coverage Thresholds (Enforced)

- Minimum: 80%
- Target: 90%
- Enforced by: post-test hook

### TypeScript (Strict Mode)

- No `any` types
- No unsafe operations
- All errors must be 0

### Biome Lint (Strict Rules)

- Max errors: 0
- Max warnings: 0
- Strict import organization

---

## 🔧 Configuration

All configuration is in `claude.json`:

```json
{
  "settings": {
    "enableHooks": true,
    "enableSkills": true,
    "autoLoadContext": true
  },
  "qualityGates": {
    "coverage": { "minimum": 80, "enforce": true },
    "typescript": { "strict": true, "noAny": true },
    "biome": { "maxErrors": 0 }
  }
}
```

---

## 📚 Documentation

- **Main guide**: docs/CLAUDE-CODE-SETUP.md
- **This file**: docs/CLAUDE-CODE-COMPLETE-SETUP.md
- **Quick ref**: .claude/README.md
- **Project context**: .claude/context/project-context.md
- **Workflows**: .claude/context/workflows.md

---

## 🎉 Summary

### What You Get

**6 Slash Commands** for quick actions
**3 Automated Hooks** for quality enforcement
**4 Specialized Skills** for complex tasks
**2 Context Files** for better AI understanding
**67+ HTTP Test Files** for manual testing
**Comprehensive Documentation** for all features

### Benefits

✅ **Faster Development** - Automated tasks
✅ **Better Quality** - Enforced standards
✅ **Consistent Code** - Pattern enforcement
✅ **Higher Coverage** - Automated test generation
✅ **Easier Debugging** - HTTP test files
✅ **Better Documentation** - Swagger + HTTP files

---

## 🚀 Next Steps

1. **Try commands**: Start with `/validate`
2. **Test HTTP files**: Use VS Code REST Client
3. **Run analysis**: Use `/analyze` weekly
4. **Migrate collections**: Use `/migrate` for Firebase
5. **Read context**: Review .claude/context/ files

---

**Status**: ✅ Production-Ready
**Version**: 2.0 Enhanced
**Last Updated**: November 7, 2025

Enjoy coding with Claude Code! 🎉

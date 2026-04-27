# Common Workflows for Claude Code

Quick reference for common development workflows in the **Core + Modules** architecture.

## Architecture Quick Reference

```
src/
├── core/           # Business logic (models, services, schemas)
└── modules/        # HTTP layer (routes, controllers)
    ├── web/        # mereka.io, app.mereka.io
    ├── admin/      # admin.mereka.io
    ├── hub/        # Hub dashboard
    └── shared/     # auth/, payments/
```

## New Feature Development

### 1. Planning

```
1. Review requirements
2. Check if similar feature exists in core/
3. Identify which module(s) need the HTTP endpoints
4. Plan database schema
5. Estimate complexity
```

### 2. Implementation (Core + Modules Pattern)

```bash
# Step 1: Core Layer (business logic)
1. Create model (src/core/models/Feature.ts)
2. Create schema (src/core/schemas/feature.schema.ts)
3. Create service (src/core/services/feature.service.ts)

# Step 2: Module Layer (HTTP)
4. Decide which module: web/, admin/, hub/, or shared/
5. Create controller (src/modules/{app}/controllers/)
6. Create routes (src/modules/{app}/routes/)
7. Register in module's index.ts
```

### 3. Testing

```bash
# Create tests
/api-test <feature-name>

# Run tests
npm run test:coverage

# Manual testing
# Use tests/http/<feature>.http
```

### 4. Validation

```bash
/validate              # Full validation
npm run check          # Same as /validate
```

### 5. Commit

```bash
git add .
git commit -m "feat: add <feature> module"
git push
```

## Bug Fix Workflow

### 1. Reproduce

```
1. Identify failing scenario
2. Write failing test
3. Verify test fails
```

### 2. Fix

```
1. Debug issue (check logs)
2. Implement fix
3. Verify test passes
4. Check for side effects
```

### 3. Validate

```bash
/validate
npm run test
```

### 4. Commit

```bash
git commit -m "fix: resolve <issue>"
```

## Code Review Workflow

### 1. Self-Review

```bash
/analyze               # Get health report
/validate              # Check quality
```

### 2. Pattern Check

```
Use @code-pattern-follower skill to verify:
- Naming conventions
- Import organization
- Error handling
- Response formats
```

### 3. Test Coverage

```bash
npm run test:coverage
# Ensure ≥80% coverage
```

## Refactoring Workflow

### 1. Before Refactoring

```bash
# Ensure tests exist
npm test

# Ensure tests pass
npm run test:coverage

# Create branch
git checkout -b refactor/<feature>
```

### 2. Refactor

```
1. Make changes incrementally
2. Run tests after each change
3. Ensure no behavior changes
```

### 3. Validate

```bash
/validate
npm run test:coverage
# Coverage should not decrease
```

### 4. Merge

```bash
git commit -m "refactor: improve <feature>"
git push
# Create PR
```

## Testing Workflow

### 1. Unit Tests

```typescript
// Location: tests/unit/<module>.service.test.ts
// Test: Service methods in isolation
// Mock: Database calls
// Coverage: ≥80%
```

### 2. Integration Tests

```typescript
// Location: tests/integration/<module>.routes.test.ts
// Test: API endpoints end-to-end
// Database: Real (test database)
// Coverage: All endpoints
```

### 3. Manual Tests

```http
// Location: tests/http/<module>.http
// Test: API endpoints manually
// Tool: VS Code REST Client
// Coverage: Happy paths + errors
```

### 4. Run Tests

```bash
npm test                      # All tests
npm run test:unit             # Unit only
npm run test:integration      # Integration only
npm run test:coverage         # With coverage
npm run test:watch            # Watch mode
```

## Database Migration Workflow

### 1. Analysis

```
Use @firebase-analyzer skill:
- Analyze Firebase collection structure
- Document fields and types
- Identify relationships
- Map to MongoDB schema
```

### 2. Code Generation

```bash
/migrate <collection-name>
# Generates: model, schema, service, controller, routes, tests
```

### 3. Data Migration

```typescript
// Create migration script in scripts/db/
// Transform and migrate data
// Validate data integrity
```

### 4. Testing

```bash
# Test CRUD operations
npm run test:integration

# Manual testing
# Use tests/http/<collection>.http
```

### 5. Deployment

```bash
# Run in staging first
npm run check
npm run build
# Deploy to staging
# Validate in staging
# Deploy to production
```

## Debugging Workflow

### 1. Reproduce Issue

```
1. Get error message
2. Check logs (structured logging)
3. Identify affected module
4. Write failing test
```

### 2. Debug

```bash
# Run in debug mode
npm run dev

# Check logs
tail -f logs/app.log

# Use debugger
# VS Code: F5 (with launch.json)
```

### 3. Common Issues

**MongoDB Connection**:

```bash
# Check connection
npm run env:doctor

# Verify MONGODB_URI
cat .env | grep MONGODB_URI
```

**TypeScript Errors**:

```bash
# Check types
npm run type-check

# Build
npm run build:types
```

**Linting Errors**:

```bash
# Check
npm run lint

# Auto-fix
npm run lint:fix
```

**Test Failures**:

```bash
# Run specific test
npx vitest run tests/unit/user.service.test.ts

# Debug mode
npx vitest --inspect-brk
```

## Performance Optimization Workflow

### 1. Identify Bottleneck

```
1. Enable query logging
2. Monitor slow endpoints
3. Check database indexes
4. Profile memory usage
```

### 2. Optimize Database

```
Use @database-operations-specialist skill:
- Add missing indexes
- Optimize queries
- Use aggregation pipelines
- Implement caching
```

### 3. Optimize Code

```
1. Use .lean() for read-only queries
2. Select only needed fields
3. Implement pagination
4. Reduce N+1 queries
5. Use bulk operations
```

### 4. Measure

```bash
# Load testing
# Use tools like k6, Artillery

# Monitor
# Check response times
# Verify memory usage
# Ensure no degradation
```

## Deployment Workflow

### 1. Pre-Deployment

```bash
# Full validation
npm run check

# Build
npm run build

# Test build
NODE_ENV=production npm start

# Check for warnings
```

### 2. Environment Preparation

```
1. Verify environment variables
2. Check database connection
3. Ensure Firebase configured (if needed)
4. Verify Stripe keys (if applicable)
```

### 3. Deploy

```bash
# Staging first
git push staging main

# Verify in staging
# Run smoke tests

# Production
git push production main

# Monitor logs
# Check health endpoint
```

### 4. Post-Deployment

```
1. Monitor error rates
2. Check performance metrics
3. Verify critical flows
4. Be ready to rollback
```

## Quick Fixes

### Auto-Fix Linting

```bash
/fix
# or
npm run lint:fix && npm run format
```

### Update Dependencies

```bash
npm update
npm audit fix
npm run check  # Ensure nothing broke
```

### Clear Build Cache

```bash
npm run clean:full
npm install
npm run build
```

### Reset Database (Development)

```bash
# Clear all collections
npm run db:reset

# Seed reference data
npm run db:seed
```

## Emergency Procedures

### Rollback Deployment

```bash
# Identify last good commit
git log --oneline -10

# Deploy previous version
git checkout <commit-hash>
git push production HEAD --force

# Or use deployment tool rollback
```

### Fix Production Issue

```bash
# Create hotfix branch
git checkout -b hotfix/<issue>

# Fix issue
# Test thoroughly
npm run check

# Deploy to staging first
# Verify fix
# Deploy to production
# Merge to main
```

## Daily Development Checklist

### Morning

- [ ] Pull latest changes (`git pull`)
- [ ] Install dependencies if needed (`npm install`)
- [ ] Check environment (`npm run env:doctor`)
- [ ] Review open issues/PRs

### During Development

- [ ] Follow User module pattern
- [ ] Write tests as you code
- [ ] Run `npm run check:fast` frequently
- [ ] Commit regularly with clear messages

### Before Commit

- [ ] Run `/validate` (full validation)
- [ ] Ensure tests pass (`npm test`)
- [ ] Check coverage (`npm run test:coverage`)
- [ ] Review changes (`git diff`)
- [ ] Write clear commit message

### Before Push

- [ ] Rebase on main if needed
- [ ] Run full validation one more time
- [ ] Push to feature branch
- [ ] Create PR if ready

### End of Day

- [ ] Commit work in progress
- [ ] Push to backup branch
- [ ] Update documentation if needed
- [ ] Review tomorrow's tasks

## Useful Commands Reference

```bash
# Development
npm run dev              # Start with hot reload
npm start                # Run production build

# Validation
npm run check            # Full (use before commit)
npm run check:fast       # Quick (linting + types)
npm run validate:all     # All validation scripts

# Testing
npm test                 # All tests
npm run test:coverage    # With coverage report
npm run test:watch       # Watch mode

# Database
npm run db:seed          # Seed reference data
npm run db:migrate       # Run migrations

# Building
npm run build            # Full build
npm run clean            # Clean build artifacts

# Quality
npm run lint             # Check linting
npm run lint:fix         # Auto-fix linting
npm run format           # Format code
npm run type-check       # TypeScript check
```

## Claude Code Commands

```bash
/validate               # Run all validations
/test                   # Test coverage analysis
/migrate <collection>   # Migrate Firebase to MongoDB
/analyze                # Project health check
/fix                    # Auto-fix issues
/api-test <feature>     # Create HTTP test file
```

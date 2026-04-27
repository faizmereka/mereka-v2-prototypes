# Pre-Migration Hook

This hook runs before migrating a Firebase collection to ensure readiness and prevent errors.

## Trigger

Executes when running `/migrate <collection>` command.

## Tasks

### 1. Environment Check

```bash
# Verify MongoDB connection
node -e "require('./dist/js/config/database.js').connectDB()"

# Check Firebase credentials
node -e "require('./dist/js/config/firebase.js')"
```

### 2. Validation Checks

- ✅ MongoDB is running and accessible
- ✅ Firebase credentials are configured
- ✅ Build is up to date (dist/ exists)
- ✅ No uncommitted changes (clean git status)
- ✅ All tests passing
- ✅ Current branch is not main/master

### 3. Pre-Migration Analysis

- Check if collection already exists in MongoDB
- Verify Firebase data export available
- Estimate migration complexity
- Calculate required time

### 4. Dependency Check

Ensure required models exist:

- If migrating "bookings", check "users" and "hubs" exist
- Verify reference data is seeded
- Check for circular dependencies

### 5. Backup Recommendation

```
⚠️  Before migrating, ensure you have:
   - MongoDB backup (if production)
   - Firebase export backup
   - Current branch committed
   - Tests passing
```

## Pre-Flight Checklist

```
🚀 Pre-Migration Checklist
==========================

Environment:
  ✅ MongoDB connected
  ✅ Firebase configured
  ✅ Build up to date

Code Quality:
  ✅ All tests passing
  ✅ No linting errors
  ✅ Clean git status

Dependencies:
  ✅ Required models exist
  ✅ Reference data seeded
  ✅ No circular dependencies

Safety:
  ✅ Not on main branch
  ✅ Backup available
  ⚠️  Consider creating feature branch

Proceed with migration? (y/n)
```

## Auto-Fix Common Issues

### Issue: MongoDB Not Connected

```
❌ MongoDB connection failed
🔧 Auto-fix: Starting MongoDB service...
✅ MongoDB connected
```

### Issue: Build Outdated

```
⚠️  Build is outdated
🔧 Auto-fix: Running npm run build...
✅ Build complete
```

### Issue: Uncommitted Changes

```
⚠️  You have uncommitted changes
💡 Recommendation: Commit or stash changes

Options:
  1. Commit now (with message)
  2. Stash changes
  3. Continue anyway
  4. Abort migration
```

## Collection-Specific Checks

### Migrating Users/Hubs

- Critical collection, extra validation
- Require explicit confirmation
- Suggest creating backup first

### Migrating Child Collections

- Verify parent collection exists
- Check relationships are defined
- Validate foreign key constraints

### Migrating with References

- Ensure reference data models exist
- Verify seeding is complete
- Check for orphaned references

## Example Output

```
🔍 Pre-Migration Validation: experiences
=========================================

Environment Status:
  ✅ MongoDB:    Connected (mereka-dev)
  ✅ Firebase:   Configured
  ✅ Build:      Up to date (2 minutes ago)
  ✅ Tests:      All passing (127/127)

Dependencies:
  ✅ Hub model:         Exists
  ✅ User model:        Exists
  ✅ FocusArea model:   Exists
  ✅ Reference data:    Seeded

Git Status:
  ✅ Branch:      feature/migrate-experiences
  ✅ Changes:     Clean
  ⚠️  Not merged:  3 commits ahead of main

Safety Checks:
  ✅ Not on main branch
  ⚠️  No backup detected

Migration Estimate:
  Complexity:    Medium
  Est. time:     15-20 minutes
  Files created: 6 (model, schema, service, controller, routes, tests)

⚠️  RECOMMENDATION:
Before proceeding, ensure you have a MongoDB backup.
Would you like to create a backup? (y/n)

✅ All checks passed. Ready to migrate!
```

## Error Prevention

### Common Issues Prevented

1. ❌ Migrating without dependencies
2. ❌ Overwriting existing collection
3. ❌ Migration on dirty git state
4. ❌ Missing Firebase data
5. ❌ Circular dependencies

### Warnings Issued

1. ⚠️ Migrating critical collection
2. ⚠️ Large data volume
3. ⚠️ Complex relationships
4. ⚠️ No backup detected

## Configuration

Customize checks in `.claude/config/migration.json`:

```json
{
  "requireCleanGit": true,
  "requireTests": true,
  "requireBackup": false,
  "allowMainBranch": false,
  "complexityThreshold": "medium"
}
```

## Bypass (Not Recommended)

Force migration (skip checks):

```bash
SKIP_PRE_MIGRATION=true /migrate collection
```

**WARNING**: Only use for development/testing. Never in production.

# Archived Tests - Migration Notes

**Date**: January 27, 2026  
**Status**: Removed - Consolidated into `v2-e2e/` tests

## Overview

The test files in `tests/auth/`, `tests/experience/`, and `tests/home/` have been **consolidated and removed**. All functionality has been migrated to the `tests/v2-e2e/` directory structure. This document serves as a reference for the migration that occurred.

## Migration Summary

### Authentication Tests

| Original File | Migrated To | Coverage |
|---------------|-------------|----------|
| `auth/auth-login.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Complete |
| `auth/auth-registration.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Complete |
| `auth/auth-logout.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Complete |
| `auth/auth-password-reset.spec.ts` | `v2-e2e/auth/authentication-e2e.spec.ts` | ✅ Complete |

### Home Tests

| Original File | Migrated To | Coverage |
|---------------|-------------|----------|
| `home/home-page-elements.spec.ts` | `v2-e2e/home/homepage-e2e.spec.ts` | ✅ Complete |

### Experience Tests

| Original File | Migrated To | Coverage |
|---------------|-------------|----------|
| `experience/create-physical-experience.spec.ts` | `v2-e2e/experience/experience-creation-e2e.spec.ts` | ✅ Complete |
| `experience/home-to-experience-redirection.spec.ts` | `v2-e2e/experience/experience-detail-e2e.spec.ts` | ✅ Complete |

## What Changed

### Improvements in v2-e2e Tests

1. **Standardized URL Handling**: All tests now use `BASE_URL` environment variable logic
2. **Enhanced Coverage**: Added missing scenarios (logout, comprehensive homepage verification)
3. **Better Organization**: Consolidated related tests into single files per feature area
4. **Page Object Model**: Integrated POM patterns from existing tests
5. **Helper Functions**: Uses centralized helper functions for common operations

### Key Differences

| Aspect | Original Tests | v2-e2e Tests |
|--------|---------------|---------------|
| **Organization** | Granular (separate files per flow) | Comprehensive (one file per feature) |
| **URL Handling** | Hardcoded URLs | BASE_URL environment variable |
| **Test Patterns** | Page Object Model | POM + Helper Functions |
| **Coverage** | UI-focused | API-based + UI-focused |

## Action Required

**For New Test Development:**
- ✅ Use `tests/v2-e2e/` directory structure
- ✅ Follow patterns established in `v2-e2e/` tests
- ✅ Use `BASE_URL` environment variable logic
- ✅ Leverage both POM fixtures and helper functions

**For Existing Test Maintenance:**
- ✅ Update tests in `v2-e2e/` directory
- ✅ All original tests have been removed after successful consolidation
- 📝 Reference this document if needed for migration patterns

## Removal Timeline

- **January 27, 2026**: Tests consolidated into `v2-e2e/`
- **January 27, 2026**: Original test files removed after verification

---

**Note**: All deprecated test files have been removed. All test development uses the `v2-e2e/` structure.

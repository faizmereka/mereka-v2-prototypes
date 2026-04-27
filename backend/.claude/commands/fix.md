# Fix Command

Automatically fix common issues in the codebase.

## Tasks

1. **Auto-fix Linting Issues**:
   - Run `npm run lint:fix`
   - Report what was fixed

2. **Format Code**:
   - Run `npm run format`
   - Ensure consistent formatting

3. **Fix Import Organization**:
   - Organize imports per Biome rules
   - Separate type imports
   - Add newlines between groups

4. **Fix Common Type Errors**:
   - Replace `any` with proper types
   - Add missing type annotations
   - Fix unsafe operations

5. **Verify Fixes**:
   - Run `npm run check:fast`
   - Ensure no new issues introduced

## Success Criteria

- All auto-fixable linting issues resolved
- Code is properly formatted
- Imports are organized
- No new errors introduced

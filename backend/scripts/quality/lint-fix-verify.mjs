#!/usr/bin/env node

/**
 * Lint Fix Verification - Ensure auto-fixes don't break code
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

console.log('🔧 Running lint with auto-fix...\n');

try {
  // Run lint with fix
  await execAsync('npm run lint:fix');
  console.log('✅ Lint fixes applied\n');

  // Verify TypeScript still compiles
  console.log('🔍 Verifying TypeScript compilation...');
  await execAsync('npm run type-check');
  console.log('✅ TypeScript check passed\n');

  // Verify lint passes without warnings
  console.log('🔍 Verifying lint passes...');
  await execAsync('npm run lint');
  console.log('✅ Lint check passed\n');

  // Run tests
  console.log('🔍 Running tests...');
  await execAsync('npm test');
  console.log('✅ Tests passed\n');

  console.log('✅ All post-fix validations passed!');
  console.log('💡 Auto-fixes did not break anything');
} catch (error) {
  console.error('\n❌ Post-fix validation failed!');
  console.error(error.stdout || error.message);
  process.exit(1);
}

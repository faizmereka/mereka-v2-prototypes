#!/usr/bin/env node

/**
 * Validate exports - ensure all exports point to dist/ not src/
 */

import { existsSync, readFileSync } from 'node:fs';

console.log('🔍 Validating package exports...\n');

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Check main entry points
if (packageJson.main?.includes('/src/')) {
  console.error('❌ package.json "main" points to src/');
  console.error(`   ${packageJson.main}`);
  process.exit(1);
}

if (packageJson.exports) {
  for (const [key, value] of Object.entries(packageJson.exports)) {
    if (typeof value === 'string' && value.includes('/src/')) {
      console.error(`❌ export "${key}" points to src/`);
      console.error(`   ${value}`);
      process.exit(1);
    }
  }
}

// Verify dist exists for built project
if (existsSync('./dist')) {
  const distTypes = existsSync('./dist/types');
  const distJs = existsSync('./dist/js');

  if (!distTypes || !distJs) {
    console.warn('⚠️  dist/ exists but missing types or js folders');
    console.warn('   Run: pnpm run build');
  } else {
    console.log('✅ dist/types and dist/js exist');
  }
}

console.log('✅ All exports are valid');

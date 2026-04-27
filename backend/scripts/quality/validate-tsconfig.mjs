#!/usr/bin/env node

/**
 * Validate TypeScript configuration consistency
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

console.log('🔍 Validating TypeScript configuration...\n');

let hasErrors = false;

// Check 1: All required tsconfigs exist
const requiredConfigs = ['tsconfig.json', 'tsconfig.build.json', 'tsconfig.runtime.json'];

console.log('📋 Checking required tsconfig files...');
for (const config of requiredConfigs) {
  if (existsSync(config)) {
    console.log(`  ✅ ${config}`);
  } else {
    console.log(`  ❌ ${config} missing`);
    hasErrors = true;
  }
}

// Check 2: Validate configs can be read by TypeScript
console.log('\n🛡️  Validating TypeScript configurations...');
try {
  await execAsync('npx tsc --showConfig --project tsconfig.json > /dev/null 2>&1');
  console.log('  ✅ tsconfig.json is valid');
} catch {
  console.log('  ❌ tsconfig.json has errors');
  hasErrors = true;
}

try {
  await execAsync('npx tsc --showConfig --project tsconfig.build.json > /dev/null 2>&1');
  console.log('  ✅ tsconfig.build.json is valid');
} catch {
  console.log('  ❌ tsconfig.build.json has errors');
  hasErrors = true;
}

// Check 3: Verify dist folders exist
console.log('\n📦 Checking build outputs...');
if (existsSync('dist/types')) {
  console.log('  ✅ dist/types/ exists');
} else {
  console.log('  ⚠️  dist/types/ missing (run: npm run build:types)');
}

if (existsSync('dist/js')) {
  console.log('  ✅ dist/js/ exists');
} else {
  console.log('  ⚠️  dist/js/ missing (run: npm run build:js)');
}

if (hasErrors) {
  console.log('\n❌ TypeScript configuration has issues!');
  process.exit(1);
}

console.log('\n✅ TypeScript configuration is valid!');

#!/usr/bin/env node

/**
 * Comprehensive validation script - runs all quality checks
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const checks = [
  {
    name: 'TypeScript Type Check',
    command: 'pnpm run type-check',
    critical: true,
  },
  {
    name: 'Biome Lint',
    command: 'pnpm run lint',
    critical: true,
  },
  {
    name: 'Prettier Format Check',
    command: 'pnpm run format:check',
    critical: false,
  },
  {
    name: 'Import Validation',
    command: 'node scripts/validation/validate-imports.mjs',
    critical: true,
  },
  {
    name: 'Export Validation',
    command: 'node scripts/validation/validate-exports.mjs',
    critical: false,
  },
  {
    name: 'Code Quality',
    command: 'node scripts/validation/validate-code-quality.mjs',
    critical: false,
  },
  {
    name: 'Environment Validation',
    command: 'node scripts/validation/validate-env.mjs',
    critical: true,
  },
  {
    name: 'Secret Scanning',
    command: 'node scripts/validation/scan-secrets.mjs',
    critical: true,
  },
];

console.log('🔍 Running comprehensive validation...\n');

let failedChecks = 0;
let warnings = 0;

for (const check of checks) {
  process.stdout.write(`⏳ ${check.name}... `);

  try {
    await execAsync(check.command);
    console.log('✅');
  } catch (error) {
    if (check.critical) {
      console.log('❌ FAILED');
      failedChecks++;
    } else {
      console.log('⚠️  WARNING');
      warnings++;
    }

    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${checks.length - failedChecks - warnings}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Failed: ${failedChecks}`);
console.log('='.repeat(50));

if (failedChecks > 0) {
  console.error('\n❌ Validation failed with critical errors');
  process.exit(1);
}

if (warnings > 0) {
  console.warn('\n⚠️  Validation passed with warnings - please address them');
}

console.log('\n✅ All validations passed!');

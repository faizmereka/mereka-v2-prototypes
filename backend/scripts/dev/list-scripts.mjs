#!/usr/bin/env node

/**
 * List all npm scripts with descriptions
 */

import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const scripts = packageJson.scripts || {};

console.log('📚 Available Scripts\n');
console.log('='.repeat(70));

// Group scripts by category
const categories = {
  Development: ['dev', 'start'],
  Building: [
    'build',
    'build:types',
    'build:js',
    'build:prod',
    'clean',
    'clean:full',
    'clean:build',
  ],
  'Type Checking': ['type-check'],
  Linting: ['lint', 'lint:fix', 'lint:strict', 'lint:fix:verify'],
  Formatting: ['format', 'format:check'],
  Testing: ['test', 'test:watch', 'test:unit', 'test:integration', 'test:e2e', 'test:coverage'],
  Validation: ['validate:all', 'validate:imports', 'validate:exports', 'validate:tsconfig'],
  Verification: [
    'verify:secrets',
    'verify:code-quality',
    'verify:type-safety',
    'verify:circular-deps',
  ],
  'Quality Checks': ['check', 'check:fast', 'check:full'],
  Database: ['db:seed', 'db:migrate'],
  Environment: ['env:validate', 'env:doctor', 'doctor'],
};

for (const [category, scriptNames] of Object.entries(categories)) {
  console.log(`\n📂 ${category}`);
  console.log('-'.repeat(70));

  for (const name of scriptNames) {
    if (scripts[name]) {
      console.log(`  ${name.padEnd(25)} ${scripts[name]}`);
    }
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`\nTotal scripts: ${Object.keys(scripts).length}`);
console.log('\n💡 Run any script with: npm run <script-name>');
console.log('💡 Example: npm run dev');

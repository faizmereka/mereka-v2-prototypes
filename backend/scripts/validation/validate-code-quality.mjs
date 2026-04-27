#!/usr/bin/env node

/**
 * Validate code quality standards
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let issues = 0;

// Check 1: No duplicate test files
console.log('🔍 Checking for duplicate test files...');
const testFiles = new Map();

function findTestFiles(dir, basePath = '') {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (['node_modules', 'dist', 'coverage'].includes(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findTestFiles(fullPath, join(basePath, entry));
    } else if (entry.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
      const basename = entry.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '');
      if (testFiles.has(basename)) {
        console.error(`❌ Duplicate test file: ${basename}`);
        console.error(`   ${testFiles.get(basename)}`);
        console.error(`   ${join(basePath, entry)}\n`);
        issues++;
      } else {
        testFiles.set(basename, join(basePath, entry));
      }
    }
  }
}

findTestFiles('./tests');

// Check 2: Test files should be in tests/ or __tests__/
console.log('🔍 Checking test file locations...');

function checkTestLocations(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (['node_modules', 'dist', 'coverage', 'tests', '__tests__'].includes(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      checkTestLocations(fullPath);
    } else if (entry.match(/\.(test|spec)\.(ts|tsx)$/)) {
      console.warn(`⚠️  Test file outside tests/ directory: ${fullPath}`);
      console.warn('   Consider moving to tests/ or creating __tests__/ subfolder\n');
    }
  }
}

checkTestLocations('./src');

// Check 3: Ensure .env.example exists
console.log('🔍 Checking for .env.example...');
if (!existsSync('./.env.example')) {
  console.error('❌ Missing .env.example file');
  issues++;
} else {
  console.log('✅ .env.example exists');
}

// Check 4: Ensure README exists
console.log('🔍 Checking for README...');
if (!existsSync('./README.md')) {
  console.error('❌ Missing README.md file');
  issues++;
} else {
  console.log('✅ README.md exists');
}

console.log(`\n${'='.repeat(50)}`);

if (issues > 0) {
  console.error(`❌ Found ${issues} code quality issues`);
  process.exit(1);
}

console.log('✅ Code quality validation passed');

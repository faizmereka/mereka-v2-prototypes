#!/usr/bin/env node

/**
 * Validate import paths - prevent deep imports and enforce module boundaries
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN_PATTERNS = [
  /from\s+['"]@\/dist\//, // No dist imports
  /from\s+['"]\.\.\/\.\.\/\.\.\//, // Max 2 levels of ../
];

let violations = 0;

function checkFile(filePath) {
  if (!filePath.match(/\.(ts|tsx|js|jsx|mjs)$/)) return;
  if (filePath.includes('node_modules')) return;
  if (filePath.includes('dist/')) return;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    FORBIDDEN_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        console.error(`❌ ${filePath}:${index + 1}`);
        console.error(`   ${line.trim()}`);
        console.error(`   Forbidden import pattern detected\n`);
        violations++;
      }
    });
  });
}

function walkDirectory(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage', '.cache'].includes(entry)) {
        walkDirectory(fullPath);
      }
    } else {
      checkFile(fullPath);
    }
  }
}

console.log('🔍 Validating import paths...\n');

walkDirectory('./src');
walkDirectory('./tests');

if (violations > 0) {
  console.error(`\n❌ Found ${violations} import violations`);
  process.exit(1);
}

console.log('✅ All imports are valid');

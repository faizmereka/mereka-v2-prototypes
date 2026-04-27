#!/usr/bin/env node

/**
 * Scan for potential secrets in codebase
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Generic API Key', pattern: /api[_-]?key['"]\s*[:=]\s*['"][a-zA-Z0-9]{20,}/ },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/ },
  { name: 'MongoDB Connection String', pattern: /mongodb(\+srv)?:\/\/[^\s'"]+:[^\s'"]+@/ },
];

const IGNORE_FILES = ['.env.example', 'package-lock.json', 'pnpm-lock.yaml'];
const IGNORE_DIRS = ['node_modules', 'dist', 'coverage', '.cache', 'data'];

let violations = 0;

function scanFile(filePath) {
  const fileName = filePath.split('/').pop();
  if (IGNORE_FILES.includes(fileName)) return;

  if (!filePath.match(/\.(ts|tsx|js|jsx|mjs|json|md|txt)$/)) return;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SECRET_PATTERNS.forEach(({ name, pattern }) => {
        if (pattern.test(line)) {
          console.error(`🚨 Potential ${name} found:`);
          console.error(`   ${filePath}:${index + 1}`);
          console.error(`   ${line.trim().substring(0, 80)}...\n`);
          violations++;
        }
      });
    });
  } catch {
    // Skip binary files
  }
}

function walkDirectory(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry) || entry.startsWith('.')) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
}

console.log('🔍 Scanning for potential secrets...\n');

walkDirectory('.');

if (violations > 0) {
  console.error(`\n❌ Found ${violations} potential secrets`);
  console.error('⚠️  Review and move to environment variables');
  process.exit(1);
}

console.log('✅ No secrets detected');

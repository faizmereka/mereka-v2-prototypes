#!/usr/bin/env node

/**
 * Check for circular dependencies
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

console.log('🔄 Checking for circular dependencies...\n');

const importGraph = new Map();
let filesScanned = 0;

// Build import graph
function scanFile(filePath) {
  if (!filePath.match(/\.(ts|tsx|js|jsx|mjs)$/)) return;
  if (filePath.includes('node_modules') || filePath.includes('dist/')) return;

  filesScanned++;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const imports = [];

    // Match import statements
    const importRegex =
      /import\s+(?:type\s+)?(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Only track internal imports (path aliases)
      if (
        importPath.startsWith('@/') ||
        importPath.startsWith('@models/') ||
        importPath.startsWith('@services/') ||
        importPath.startsWith('@controllers/')
      ) {
        imports.push(importPath);
      }
    }

    const relPath = filePath.replace(`${process.cwd()}/`, '');
    importGraph.set(relPath, imports);
  } catch {
    // Skip files that can't be read
  }
}

// Walk directory
function walkDirectory(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (['node_modules', 'dist', 'coverage', '.cache'].includes(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
}

// Scan codebase
walkDirectory('./src');

console.log(`📊 Scanned ${filesScanned} files\n`);

// Simple cycle detection
function findCycles() {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(file, path = []) {
    if (recursionStack.has(file)) {
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), file]);
      }
      return;
    }

    if (visited.has(file)) return;

    visited.add(file);
    recursionStack.add(file);
    path.push(file);

    const imports = importGraph.get(file) || [];
    // For now, simple check - could be enhanced
    for (const importPath of imports) {
      // Find files that match this import
      for (const targetFile of importGraph.keys()) {
        if (targetFile.includes(importPath.replace('@/', 'src/'))) {
          dfs(targetFile, [...path]);
        }
      }
    }

    recursionStack.delete(file);
    path.pop();
  }

  for (const file of importGraph.keys()) {
    if (!visited.has(file)) {
      dfs(file);
    }
  }

  return cycles;
}

const cycles = findCycles();

if (cycles.length > 0) {
  console.log(`❌ Found ${cycles.length} circular dependencies:\n`);
  cycles.forEach((cycle, i) => {
    console.log(`  Cycle ${i + 1}:`);
    cycle.forEach((file) => console.log(`    → ${file}`));
    console.log('');
  });
  process.exit(1);
}

console.log('✅ No circular dependencies found!');

#!/usr/bin/env node

/**
 * Type Safety Checker - Scan for unsafe type patterns
 */

import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';

const UNSAFE_PATTERNS = [
  {
    pattern: /\s+as\s+any\b/g,
    name: 'as any cast',
    severity: 'error',
    suggestion: 'Use proper type parsing or create specific types',
  },
  {
    pattern: /\bas\s+unknown\s+as\s+/g,
    name: 'as unknown as cast',
    severity: 'warning',
    suggestion: 'Use type guards or parsing functions',
  },
  {
    pattern: /any\[\]/g,
    name: 'any[] type',
    severity: 'warning',
    suggestion: 'Use specific array types like T[]',
  },
  {
    pattern: /:\s*any\b(?!\[\])/g,
    name: 'any type annotation',
    severity: 'error',
    suggestion: 'Use specific types or unknown',
  },
  {
    pattern: /@ts-ignore/g,
    name: '@ts-ignore comment',
    severity: 'error',
    suggestion: 'Use @ts-expect-error with explanation',
  },
  {
    pattern: /@ts-expect-error(?!\s+--)/g,
    name: '@ts-expect-error without explanation',
    severity: 'warning',
    suggestion: 'Add explanation: @ts-expect-error -- reason here',
  },
];

const SCAN_PATTERNS = [
  'src/**/*.{ts,tsx}',
  'tests/**/*.{ts,tsx}',
  '!node_modules/**',
  '!**/*.d.ts',
  '!**/dist/**',
];

class TypeSafetyChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.filesScanned = 0;
  }

  shouldExclude(filePath) {
    const excludePatterns = [/node_modules/, /\.d\.ts$/, /dist\//, /coverage\//];
    return excludePatterns.some((p) => p.test(filePath));
  }

  scanFile(filePath) {
    if (this.shouldExclude(filePath)) return;

    this.filesScanned++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      UNSAFE_PATTERNS.forEach(({ pattern, name, severity, suggestion }) => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const before = content.substring(0, match.index);
          const lineNumber = before.split('\n').length;
          const lineContent = lines[lineNumber - 1] || '';

          const issue = {
            file: path.relative(process.cwd(), filePath),
            line: lineNumber,
            pattern: name,
            suggestion,
            code: lineContent.trim(),
          };

          if (severity === 'error') {
            this.errors.push(issue);
          } else {
            this.warnings.push(issue);
          }
        }
      });
    } catch {
      // Skip files that can't be read
    }
  }

  async scan() {
    console.log('🔍 Scanning for type safety issues...\n');

    for (const pattern of SCAN_PATTERNS) {
      const files = glob.sync(pattern, { ignore: ['node_modules/**'] });
      files.forEach((file) => this.scanFile(path.join(process.cwd(), file)));
    }
  }

  printResults() {
    console.log(`\n📊 Scanned ${this.filesScanned} files\n`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ No type safety issues found!');
      return true;
    }

    if (this.errors.length > 0) {
      console.log(`❌ Errors: ${this.errors.length}\n`);
      this.errors.forEach(({ file, line, pattern, suggestion, code }) => {
        console.log(`  ${file}:${line}`);
        console.log(`  Pattern: ${pattern}`);
        console.log(`  Code: ${code}`);
        console.log(`  💡 ${suggestion}\n`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${this.warnings.length}\n`);
      this.warnings.forEach(({ file, line, pattern, suggestion, code }) => {
        console.log(`  ${file}:${line}`);
        console.log(`  Pattern: ${pattern}`);
        console.log(`  Code: ${code}`);
        console.log(`  💡 ${suggestion}\n`);
      });
    }

    return this.errors.length === 0;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      filesScanned: this.filesScanned,
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        passed: this.errors.length === 0,
      },
      issues: {
        errors: this.errors,
        warnings: this.warnings,
      },
    };

    fs.writeFileSync('type-safety-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Report saved to type-safety-report.json');
  }
}

// Run check
const checker = new TypeSafetyChecker();
await checker.scan();
const passed = checker.printResults();
checker.generateReport();

if (!passed) {
  console.log('\n❌ Type safety check failed!');
  process.exit(1);
}

console.log('\n✅ Type safety check passed!');

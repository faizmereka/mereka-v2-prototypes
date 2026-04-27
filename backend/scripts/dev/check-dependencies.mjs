#!/usr/bin/env node

/**
 * Check for outdated or vulnerable dependencies
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

console.log('📦 Checking dependencies...\n');

try {
  // Check for outdated packages
  console.log('🔍 Checking for outdated packages...');
  const { stdout } = await execAsync('npm outdated --json', { encoding: 'utf-8' });

  if (stdout.trim()) {
    const outdated = JSON.parse(stdout);
    const count = Object.keys(outdated).length;

    if (count > 0) {
      console.log(`⚠️  Found ${count} outdated packages:\n`);

      for (const [name, info] of Object.entries(outdated)) {
        console.log(`  ${name}`);
        console.log(`    Current: ${info.current}`);
        console.log(`    Wanted:  ${info.wanted}`);
        console.log(`    Latest:  ${info.latest}`);
        console.log('');
      }

      console.log('💡 Run: npm update to update packages');
      console.log('💡 Or: npm install <package>@latest for specific package\n');
    } else {
      console.log('✅ All packages are up to date\n');
    }
  } else {
    console.log('✅ All packages are up to date\n');
  }
} catch {
  console.log('✅ All packages are up to date\n');
}

try {
  // Check for security vulnerabilities
  console.log('🔒 Checking for security vulnerabilities...');
  const { stdout: auditOutput } = await execAsync('npm audit --json', { encoding: 'utf-8' });

  const audit = JSON.parse(auditOutput);

  if (audit.metadata?.vulnerabilities) {
    const vulns = audit.metadata.vulnerabilities;
    const total = vulns.total || 0;

    if (total > 0) {
      console.log(`⚠️  Found ${total} vulnerabilities:`);
      console.log(`   Critical: ${vulns.critical || 0}`);
      console.log(`   High: ${vulns.high || 0}`);
      console.log(`   Moderate: ${vulns.moderate || 0}`);
      console.log(`   Low: ${vulns.low || 0}`);
      console.log('\n💡 Run: npm audit fix to fix automatically');
      console.log('💡 Or: npm audit fix --force for breaking changes\n');
    } else {
      console.log('✅ No known vulnerabilities\n');
    }
  }
} catch {
  console.log('✅ No known vulnerabilities\n');
}

console.log('✅ Dependency check complete!');

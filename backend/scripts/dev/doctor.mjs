#!/usr/bin/env node

/**
 * Doctor - Comprehensive system diagnostics
 */

import { exec } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Load .env file if it exists
if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
}

console.log('🏥 Running System Doctor...\n');
console.log('='.repeat(70));

let issues = 0;

// Check 1: Node.js version
console.log('\n📦 Node.js');
console.log(`   Version: ${process.version}`);
const nodeVersion = parseFloat(process.version.slice(1));
if (nodeVersion >= 20.11) {
  console.log('   ✅ Meets requirement (>=20.11)');
} else {
  console.log('   ❌ Requires Node.js >= 20.11');
  issues++;
}

// Check 2: npm
try {
  const { stdout } = await execAsync('npm --version');
  console.log(`\n📦 npm\n   Version: ${stdout.trim()} ✅`);
} catch {
  console.log('\n📦 npm\n   ❌ Not found');
  issues++;
}

// Check 3: TypeScript
try {
  const { stdout } = await execAsync('npx tsc --version');
  console.log(`\n📦 TypeScript\n   ${stdout.trim()} ✅`);
} catch {
  console.log('\n📦 TypeScript\n   ❌ Not found (run: npm install)');
  issues++;
}

// Check 4: MongoDB
console.log('\n🗄️  MongoDB');
if (process.env.MONGODB_URI) {
  console.log('   URI: ✅ Configured');
  console.log(`   ${process.env.MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
} else {
  console.log('   ❌ MONGODB_URI not set');
  issues++;
}

// Check 5: Environment files
console.log('\n📄 Environment Files');
if (existsSync('.env.example')) {
  console.log('   .env.example: ✅');
} else {
  console.log('   .env.example: ❌ Missing');
  issues++;
}

if (existsSync('.env')) {
  console.log('   .env: ✅');
} else {
  console.log('   .env: ⚠️  Missing (run: cp .env.example .env)');
  issues++;
}

// Check 6: Git hooks
console.log('\n🪝 Git Hooks (Husky)');
if (existsSync('.husky/_')) {
  console.log('   Husky: ✅ Installed');

  const hooks = ['pre-commit', 'pre-push', 'commit-msg'];
  for (const hook of hooks) {
    if (existsSync(`.husky/${hook}`)) {
      console.log(`   ${hook}: ✅`);
    } else {
      console.log(`   ${hook}: ❌ Missing`);
      issues++;
    }
  }
} else {
  console.log('   ❌ Husky not installed (run: npm install)');
  issues++;
}

// Check 7: TypeScript configs
console.log('\n🔧 TypeScript Configuration');
const tsconfigs = ['tsconfig.json', 'tsconfig.build.json', 'tsconfig.runtime.json'];
for (const config of tsconfigs) {
  if (existsSync(config)) {
    console.log(`   ${config}: ✅`);
  } else {
    console.log(`   ${config}: ❌ Missing`);
    issues++;
  }
}

// Check 8: Build artifacts
console.log('\n📦 Build Artifacts');
if (existsSync('dist')) {
  console.log('   dist/: ✅');
  if (existsSync('dist/types')) console.log('   dist/types/: ✅');
  if (existsSync('dist/js')) console.log('   dist/js/: ✅');
} else {
  console.log('   dist/: ⚠️  Not built (run: npm run build)');
}

// Check 9: Dependencies installed
console.log('\n📚 Dependencies');
if (existsSync('node_modules')) {
  console.log('   node_modules/: ✅');
} else {
  console.log('   node_modules/: ❌ Not installed (run: npm install)');
  issues++;
}

// Check 10: Scripts exist
console.log('\n🔨 Validation Scripts');
const scripts = [
  'scripts/validation/validate-all.mjs',
  'scripts/validation/validate-imports.mjs',
  'scripts/validation/scan-secrets.mjs',
  'scripts/quality/check-type-safety.mjs',
];

for (const script of scripts) {
  if (existsSync(script)) {
    console.log(`   ✅ ${script.split('/').pop()}`);
  } else {
    console.log(`   ❌ ${script} missing`);
    issues++;
  }
}

// Summary
console.log(`\n${'='.repeat(70)}`);

if (issues === 0) {
  console.log('\n✅ System is healthy! All checks passed.');
  console.log('\n💡 Ready to start: npm run dev');
} else {
  console.log(`\n⚠️  Found ${issues} issues - please resolve them`);
  console.log('\n💡 Run the suggested commands above to fix issues');
  process.exit(1);
}

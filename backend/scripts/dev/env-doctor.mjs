#!/usr/bin/env node

/**
 * Environment doctor - comprehensive environment diagnostics
 */

import { exec } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

console.log('🏥 Running Environment Doctor...\n');
console.log('='.repeat(60));

// Check 1: Node.js version
console.log('\n📦 Node.js Version');
console.log(`   Current: ${process.version}`);
const requiredNode = '20.11';
if (parseFloat(process.version.slice(1)) >= parseFloat(requiredNode)) {
  console.log(`   ✅ Meets requirement (>=${requiredNode})`);
} else {
  console.error(`   ❌ Requires Node.js >= ${requiredNode}`);
}

// Check 2: Package manager
console.log('\n📦 Package Manager');
try {
  const { stdout } = await execAsync('npm --version');
  console.log(`   npm: ${stdout.trim()} ✅`);
} catch {
  console.error('   ❌ npm not found');
}

// Check 3: MongoDB connection
console.log('\n🗄️  MongoDB');
if (process.env.MONGODB_URI) {
  console.log(`   URI configured: ✅`);
  console.log(`   ${process.env.MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
} else {
  console.error('   ❌ MONGODB_URI not set');
}

// Check 4: Environment files
console.log('\n📄 Environment Files');
if (existsSync('.env.example')) {
  console.log('   .env.example: ✅');
} else {
  console.error('   .env.example: ❌ Missing');
}

if (existsSync('.env')) {
  console.log('   .env: ✅');

  // Check for critical variables
  const env = readFileSync('.env', 'utf-8');
  const criticalVars = ['MONGODB_URI', 'JWT_SECRET', 'NODE_ENV'];

  console.log('\n   Critical variables:');
  for (const v of criticalVars) {
    if (env.includes(`${v}=`)) {
      console.log(`   ${v}: ✅`);
    } else {
      console.error(`   ${v}: ❌ Missing`);
    }
  }
} else {
  console.error('   .env: ❌ Missing (run: cp .env.example .env)');
}

// Check 5: TypeScript configuration
console.log('\n🔧 TypeScript Configuration');
if (existsSync('./tsconfig.json')) {
  console.log('   tsconfig.json: ✅');
} else {
  console.error('   tsconfig.json: ❌ Missing');
}

if (existsSync('./tsconfig.build.json')) {
  console.log('   tsconfig.build.json: ✅');
} else {
  console.error('   tsconfig.build.json: ❌ Missing');
}

// Check 6: Dist folder
console.log('\n📦 Build Artifacts');
if (existsSync('./dist')) {
  console.log('   dist/: ✅ Exists');
  if (existsSync('./dist/types')) console.log('   dist/types/: ✅');
  if (existsSync('./dist/js')) console.log('   dist/js/: ✅');
} else {
  console.log('   dist/: ⚠️  Not built yet (run: pnpm run build)');
}

console.log(`\n${'='.repeat(60)}`);
console.log('\n✅ Environment doctor check complete');
console.log('\nℹ️  If any checks failed, resolve them before continuing');

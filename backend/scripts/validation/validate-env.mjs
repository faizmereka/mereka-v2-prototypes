#!/usr/bin/env node

/**
 * Validate environment configuration
 */

import { existsSync, readFileSync } from 'node:fs';

console.log('🔍 Validating environment configuration...\n');

// Check .env.example exists
if (!existsSync('.env.example')) {
  console.error('❌ .env.example not found');
  process.exit(1);
}

const exampleEnv = readFileSync('.env.example', 'utf-8');
const requiredVars = [];

// Parse required variables from .env.example
exampleEnv.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key] = trimmed.split('=');
    if (key) requiredVars.push(key.trim());
  }
});

console.log(`📋 Required environment variables: ${requiredVars.length}`);

if (existsSync('.env')) {
  const actualEnv = readFileSync('.env', 'utf-8');
  const setVars = new Set();

  actualEnv.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (key) setVars.add(key.trim());
    }
  });

  const missing = requiredVars.filter((v) => !setVars.has(v));

  if (missing.length > 0) {
    console.warn('\n⚠️  Missing environment variables in .env:');
    missing.forEach((v) => console.warn(`   - ${v}`));
    console.warn('\nℹ️  Copy from .env.example and fill in values\n');
  } else {
    console.log('✅ All required variables are set');
  }
} else {
  console.warn('⚠️  .env file not found');
  console.warn('   Run: cp .env.example .env\n');
}

console.log('✅ Environment validation complete');

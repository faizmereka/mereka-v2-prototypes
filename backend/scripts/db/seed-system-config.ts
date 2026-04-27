#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { DEFAULT_RATE_LIMITS, SystemConfig } from '../../src/core/models/SystemConfig';

const SYSTEM_CONFIG_ID = 'system-config';

/**
 * Seed script for system configuration
 * Initializes the default rate limit configuration
 */
async function seedSystemConfig() {
  try {
    console.log('Starting system config seed...\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check if config already exists
    const existing = await SystemConfig.findById(SYSTEM_CONFIG_ID);

    if (existing) {
      console.log('System config already exists:');
      console.log(JSON.stringify(existing.rateLimits, null, 2));
      console.log('\nSkipping seed (use --force to overwrite)\n');

      // Check for --force flag
      if (process.argv.includes('--force')) {
        console.log('--force flag detected, updating config...');
        await SystemConfig.findByIdAndUpdate(SYSTEM_CONFIG_ID, {
          rateLimits: DEFAULT_RATE_LIMITS,
        });
        console.log('Config updated to defaults\n');
      }
    } else {
      // Create default config
      console.log('Creating default system config...');
      await SystemConfig.create({
        _id: SYSTEM_CONFIG_ID,
        rateLimits: DEFAULT_RATE_LIMITS,
      });
      console.log('Default config created:\n');
      console.log(JSON.stringify(DEFAULT_RATE_LIMITS, null, 2));
    }

    console.log('\nSystem config seed completed!\n');

    // Display current config
    const config = await SystemConfig.findById(SYSTEM_CONFIG_ID);
    console.log('Current Rate Limit Configuration:');
    console.log('================================');
    console.log(`Skip Paths: ${config?.rateLimits.skipPaths.join(', ')}`);
    console.log(`Skip Super Admin: ${config?.rateLimits.skipSuperAdmin}`);
    console.log(`\nUnauthenticated:`);
    console.log(`  - Per Minute: ${config?.rateLimits.unauthenticated.perMinute}`);
    console.log(`  - Per Day: ${config?.rateLimits.unauthenticated.perDay}`);
    console.log(`\nAuthenticated:`);
    console.log(`  - Per Minute: ${config?.rateLimits.authenticated.perMinute}`);
    console.log(`  - Per Day: ${config?.rateLimits.authenticated.perDay}`);
    console.log('');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run seed
seedSystemConfig();

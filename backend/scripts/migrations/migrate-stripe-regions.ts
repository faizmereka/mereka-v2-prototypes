#!/usr/bin/env tsx

/**
 * Migration Script: Set stripeRegion for existing hubs, users, and payments
 *
 * This script migrates existing Stripe accounts to the multi-region structure by:
 * 1. Setting stripeRegion for hubs based on their location
 * 2. Setting stripeRegion for users based on their hub's region or their own location
 * 3. Backfilling ContractPayment.stripeRegion based on expert's region
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-stripe-regions.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-stripe-regions.ts --migrate
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

// =============================================================================
// REGION HELPER (copied from stripe-region.ts)
// =============================================================================

type StripeRegion = 'malaysia' | 'atlas';

const MALAYSIA_CODES = new Set(['malaysia', 'my', 'mys']);

function getStripeRegion(country?: string | null): StripeRegion {
  if (!country) return 'atlas';
  const normalized = country.toLowerCase().trim();
  return MALAYSIA_CODES.has(normalized) ? 'malaysia' : 'atlas';
}

// =============================================================================
// MIGRATION LOGIC
// =============================================================================

interface MigrationStats {
  hubsProcessed: number;
  hubsUpdated: number;
  hubsSkipped: number;
  usersProcessed: number;
  usersUpdated: number;
  usersSkipped: number;
  paymentsProcessed: number;
  paymentsUpdated: number;
  paymentsSkipped: number;
  regionCounts: {
    malaysia: number;
    atlas: number;
  };
}

async function migrateStripeRegions(dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    hubsProcessed: 0,
    hubsUpdated: 0,
    hubsSkipped: 0,
    usersProcessed: 0,
    usersUpdated: 0,
    usersSkipped: 0,
    paymentsProcessed: 0,
    paymentsUpdated: 0,
    paymentsSkipped: 0,
    regionCounts: { malaysia: 0, atlas: 0 },
  };

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  // ==========================================================================
  // Phase 1: Update Hubs with stripeRegion
  // ==========================================================================
  console.log('\n📦 Phase 1: Updating Hubs with stripeRegion...');

  const hubsCollection = db.collection('hubs');
  const hubs = await hubsCollection
    .find({
      stripeAccountId: { $exists: true, $ne: null },
      stripeRegion: { $exists: false },
    })
    .toArray();

  console.log(`  Found ${hubs.length} hubs with Stripe accounts without stripeRegion`);

  for (const hub of hubs) {
    stats.hubsProcessed++;

    const country = hub.location?.country;
    const region = getStripeRegion(country);

    console.log(`  [Hub] ${hub.name || hub._id}: ${country || 'no country'} -> ${region}`);

    if (!dryRun) {
      await hubsCollection.updateOne({ _id: hub._id }, { $set: { stripeRegion: region } });
      stats.hubsUpdated++;
    }

    stats.regionCounts[region]++;
  }

  // Also check hubs with stripeRegion already set
  const hubsWithRegion = await hubsCollection.countDocuments({
    stripeAccountId: { $exists: true, $ne: null },
    stripeRegion: { $exists: true },
  });
  stats.hubsSkipped = hubsWithRegion;
  console.log(`  Skipped ${hubsWithRegion} hubs (already have stripeRegion)`);

  // ==========================================================================
  // Phase 2: Update Users with stripeRegion
  // ==========================================================================
  console.log('\n👤 Phase 2: Updating Users with stripeRegion...');

  const usersCollection = db.collection('users');
  const users = await usersCollection
    .find({
      stripeAccountId: { $exists: true, $ne: null },
      stripeRegion: { $exists: false },
    })
    .toArray();

  console.log(`  Found ${users.length} users with Stripe accounts without stripeRegion`);

  // Build a map of hub owners to their hub's region
  const hubsByOwner = new Map<string, StripeRegion>();
  const allHubs = await hubsCollection.find({ ownerId: { $exists: true } }).toArray();
  for (const hub of allHubs) {
    const ownerId = hub.ownerId?.toString();
    if (ownerId) {
      const region =
        hub.stripeRegion === 'malaysia' || hub.stripeRegion === 'atlas'
          ? hub.stripeRegion
          : getStripeRegion(hub.location?.country);
      hubsByOwner.set(ownerId, region);
    }
  }

  for (const user of users) {
    stats.usersProcessed++;

    const userId = user._id.toString();
    let region: StripeRegion;

    // Priority: Hub's region > User's location
    if (hubsByOwner.has(userId)) {
      region = hubsByOwner.get(userId)!;
      console.log(`  [User] ${user.name || user.email || userId}: hub owner -> ${region}`);
    } else {
      const country = user.location?.country;
      region = getStripeRegion(country);
      console.log(
        `  [User] ${user.name || user.email || userId}: ${country || 'no country'} -> ${region}`,
      );
    }

    if (!dryRun) {
      await usersCollection.updateOne({ _id: user._id }, { $set: { stripeRegion: region } });
      stats.usersUpdated++;
    }
  }

  // Also check users with stripeRegion already set
  const usersWithRegion = await usersCollection.countDocuments({
    stripeAccountId: { $exists: true, $ne: null },
    stripeRegion: { $exists: true },
  });
  stats.usersSkipped = usersWithRegion;
  console.log(`  Skipped ${usersWithRegion} users (already have stripeRegion)`);

  // ==========================================================================
  // Phase 3: Backfill ContractPayment.stripeRegion
  // ==========================================================================
  console.log('\n💳 Phase 3: Backfilling ContractPayment.stripeRegion...');

  const paymentsCollection = db.collection('contractpayments');
  const payments = await paymentsCollection
    .find({
      stripePaymentIntentId: { $exists: true, $ne: null },
      stripeRegion: { $exists: false },
    })
    .toArray();

  console.log(`  Found ${payments.length} payments without stripeRegion`);

  // Build a map of user regions
  const userRegions = new Map<string, StripeRegion>();
  const allUsers = await usersCollection
    .find({ stripeRegion: { $exists: true } })
    .project({ _id: 1, stripeRegion: 1 })
    .toArray();
  for (const user of allUsers) {
    if (user.stripeRegion === 'malaysia' || user.stripeRegion === 'atlas') {
      userRegions.set(user._id.toString(), user.stripeRegion);
    }
  }

  for (const payment of payments) {
    stats.paymentsProcessed++;

    const expertId = payment.expertId?.toString();
    let region: StripeRegion = 'atlas';

    if (expertId) {
      // Check if expert has a region set
      if (userRegions.has(expertId)) {
        region = userRegions.get(expertId)!;
      } else if (hubsByOwner.has(expertId)) {
        // Expert owns a hub
        region = hubsByOwner.get(expertId)!;
      }
    }

    console.log(`  [Payment] ${payment._id}: expert ${expertId} -> ${region}`);

    if (!dryRun) {
      await paymentsCollection.updateOne({ _id: payment._id }, { $set: { stripeRegion: region } });
      stats.paymentsUpdated++;
    }
  }

  // Also check payments with stripeRegion already set
  const paymentsWithRegion = await paymentsCollection.countDocuments({
    stripePaymentIntentId: { $exists: true, $ne: null },
    stripeRegion: { $exists: true },
  });
  stats.paymentsSkipped = paymentsWithRegion;
  console.log(`  Skipped ${paymentsWithRegion} payments (already have stripeRegion)`);

  return stats;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const migrate = args.includes('--migrate');

  if (!dryRun && !migrate) {
    console.log('Usage:');
    console.log('  npx tsx scripts/migrations/migrate-stripe-regions.ts --dry-run');
    console.log('  npx tsx scripts/migrations/migrate-stripe-regions.ts --migrate');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable not set');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  console.log(`\n🚀 Starting migration (${dryRun ? 'DRY RUN' : 'LIVE'})...`);

  try {
    const stats = await migrateStripeRegions(dryRun);

    console.log('\n===========================================');
    console.log('📊 Migration Summary');
    console.log('===========================================');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`\nHubs:`);
    console.log(`  Processed: ${stats.hubsProcessed}`);
    console.log(`  Updated: ${stats.hubsUpdated}`);
    console.log(`  Skipped: ${stats.hubsSkipped}`);
    console.log(`\nUsers:`);
    console.log(`  Processed: ${stats.usersProcessed}`);
    console.log(`  Updated: ${stats.usersUpdated}`);
    console.log(`  Skipped: ${stats.usersSkipped}`);
    console.log(`\nPayments:`);
    console.log(`  Processed: ${stats.paymentsProcessed}`);
    console.log(`  Updated: ${stats.paymentsUpdated}`);
    console.log(`  Skipped: ${stats.paymentsSkipped}`);
    console.log(`\nRegion Distribution:`);
    console.log(`  Malaysia: ${stats.regionCounts.malaysia}`);
    console.log(`  Atlas: ${stats.regionCounts.atlas}`);
    console.log('===========================================');

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made.');
      console.log('   Run with --migrate to apply changes.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main().catch(console.error);

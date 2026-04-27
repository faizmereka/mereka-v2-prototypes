/**
 * Migration: Rename FINANCIAL_MANAGE_BILLING to FINANCIAL_MANAGE_SUBSCRIPTION
 *
 * This migration updates the permission key from 'financial.manageBilling' (or lowercase)
 * to 'financial.manageSubscription' across all relevant collections.
 *
 * Affected collections:
 * - permissions: Updates the `key` field
 * - hubmembers: Updates the `permissions` array where custom permissions are stored
 *
 * Run: npx tsx scripts/migrations/rename-billing-to-subscription-permission.ts
 *
 * Options:
 *   --dry-run  Preview changes without applying them
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

// Handle both camelCase and lowercase versions
const OLD_PERMISSION_KEYS = ['financial.manageBilling', 'financial.managebilling'];
const NEW_PERMISSION_KEY = 'financial.manageSubscription';

interface MigrationStats {
  permissionsUpdated: number;
  hubMembersUpdated: number;
}

async function renameBillingToSubscriptionPermission(dryRun: boolean = false): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable not set');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration: Rename FINANCIAL_MANAGE_BILLING to FINANCIAL_MANAGE_SUBSCRIPTION');
  console.log(`${'='.repeat(60)}`);
  if (dryRun) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database connection not established');
    process.exit(1);
  }

  const stats: MigrationStats = {
    permissionsUpdated: 0,
    hubMembersUpdated: 0,
  };

  // ================================================================
  // 1. Update Permission collection
  // ================================================================
  console.log('--- Step 1: Update permissions collection ---');
  const permissionsCollection = db.collection('permissions');

  // Check if new permission already exists
  const existingNewPermission = await permissionsCollection.findOne({ key: NEW_PERMISSION_KEY });

  for (const oldKey of OLD_PERMISSION_KEYS) {
    const oldPermission = await permissionsCollection.findOne({ key: oldKey });
    if (oldPermission) {
      console.log(`  Found permission with key: ${oldKey}`);

      if (existingNewPermission) {
        console.log(`  WARNING: Permission ${NEW_PERMISSION_KEY} already exists!`);
        console.log(`  Will delete old permission ${oldKey} instead of renaming.`);

        if (!dryRun) {
          const deleteResult = await permissionsCollection.deleteOne({ key: oldKey });
          if (deleteResult.deletedCount > 0) {
            console.log(`  Deleted old permission: ${oldKey}`);
            stats.permissionsUpdated++;
          }
        } else {
          console.log(`  [DRY RUN] Would delete old permission: ${oldKey}`);
          stats.permissionsUpdated++;
        }
      } else {
        if (!dryRun) {
          const updateResult = await permissionsCollection.updateOne(
            { key: oldKey },
            {
              $set: {
                key: NEW_PERMISSION_KEY,
                name: 'Manage Subscription',
                description: 'Can manage subscription plans and billing',
              },
            },
          );
          if (updateResult.modifiedCount > 0) {
            console.log(`  Updated: ${oldKey} -> ${NEW_PERMISSION_KEY}`);
            stats.permissionsUpdated++;
          }
        } else {
          console.log(`  [DRY RUN] Would update: ${oldKey} -> ${NEW_PERMISSION_KEY}`);
          stats.permissionsUpdated++;
        }
      }
    }
  }

  if (stats.permissionsUpdated === 0) {
    console.log(`  No old permission keys found (${OLD_PERMISSION_KEYS.join(', ')})`);
    if (existingNewPermission) {
      console.log(
        `  Permission ${NEW_PERMISSION_KEY} already exists - migration may have already run.`,
      );
    }
  }

  // ================================================================
  // 2. Update HubMember.permissions arrays
  // ================================================================
  console.log('\n--- Step 2: Update hubmembers.permissions arrays ---');
  const hubMembersCollection = db.collection('hubmembers');

  for (const oldKey of OLD_PERMISSION_KEYS) {
    // Find all hub members that have the old permission in their permissions array
    const membersWithOldPermission = await hubMembersCollection
      .find({ permissions: oldKey })
      .toArray();

    if (membersWithOldPermission.length > 0) {
      console.log(`  Found ${membersWithOldPermission.length} hub members with ${oldKey}`);

      for (const member of membersWithOldPermission) {
        const memberName = member.user?.name || member._id;

        if (!dryRun) {
          // Remove old permission and add new one
          const updateResult = await hubMembersCollection.updateOne(
            { _id: member._id, permissions: oldKey },
            {
              $set: {
                'permissions.$': NEW_PERMISSION_KEY,
              },
            },
          );
          if (updateResult.modifiedCount > 0) {
            console.log(`  Updated member: ${memberName}`);
            stats.hubMembersUpdated++;
          }
        } else {
          console.log(`  [DRY RUN] Would update member: ${memberName}`);
          stats.hubMembersUpdated++;
        }
      }
    }
  }

  if (stats.hubMembersUpdated === 0) {
    console.log(`  No hub members found with old permission keys`);
  }

  // ================================================================
  // 3. Summary
  // ================================================================
  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Permissions updated: ${stats.permissionsUpdated}`);
  console.log(`  Hub members updated: ${stats.hubMembersUpdated}`);

  if (dryRun) {
    console.log('\n*** This was a DRY RUN - no changes were made ***');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\nMigration complete!');
    console.log('Please restart your backend server to pick up the changes.');
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

renameBillingToSubscriptionPermission(dryRun).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

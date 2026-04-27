#!/usr/bin/env tsx

/**
 * Migration Script: Firebase user roles -> MongoDB HubMember
 *
 * This script migrates user roles from Firebase JSON dump to MongoDB HubMember collection.
 * It reads from data/migrations/users_data.json and maps:
 * - user.roles[].hubId (Firebase agency ID) -> Hub._id (via Hub.firebaseId)
 * - user.roles[].role -> Role._id (via Role.key)
 * - userId (Firebase UID) -> User._id (via User.firebaseId)
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-hub-members.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-hub-members.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-hub-members.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-hub-members.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Hub } from '../../src/core/models/Hub';
import { HubMember, HubMemberStatus } from '../../src/core/models/HubMember';
import { Role } from '../../src/core/models/Role';
import { User } from '../../src/core/models/User';

// =============================================================================
// TYPES - Based on actual Firebase data structure
// =============================================================================

interface FirebaseRole {
  hubId: string; // Firebase agency ID
  role: string; // 'admin', 'expert', 'member', 'collaborator'
  status?: string; // 'Active', 'Requested', etc.
  joinedDate?: number;
  createdDate?: number;
  invitedDate?: number;
  addedBy?: string; // Firebase UID of who added them
  experienceId?: string; // For collaborator roles
  access?: string; // 'FULL_ACCESS'
  type?: string; // 'Free'
}

interface FirebaseUser {
  email?: string;
  name?: string;
  roles?: FirebaseRole[];
}

interface MigrationOptions {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadUsersData(): Map<string, FirebaseUser> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'users_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Users data not found: ${jsonPath}`);
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseUser>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function mapFirebaseStatus(status?: string): HubMemberStatus {
  if (!status) return HubMemberStatus.ACTIVE;
  const s = status.toLowerCase();
  if (s === 'active') return HubMemberStatus.ACTIVE;
  if (s === 'requested' || s === 'invited' || s === 'pending') return HubMemberStatus.INVITED;
  if (s === 'suspended') return HubMemberStatus.SUSPENDED;
  if (s === 'left' || s === 'removed') return HubMemberStatus.LEFT;
  return HubMemberStatus.ACTIVE;
}

// =============================================================================
// MIGRATION
// =============================================================================

async function migrateHubMembers(
  users: Map<string, FirebaseUser>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log(`\n📥 Processing ${users.size} users for roles...`);

  // Get all MongoDB mappings we need
  console.log('   Loading MongoDB mappings...');

  // 1. Get all migrated users: firebaseId -> MongoDB _id
  const migratedUsers = await User.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const userMap = new Map<string, mongoose.Types.ObjectId>();
  for (const user of migratedUsers) {
    if (user.firebaseId) {
      userMap.set(user.firebaseId, user._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   - ${userMap.size} users mapped`);

  // 2. Get all migrated hubs: firebaseId -> MongoDB _id
  const migratedHubs = await Hub.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const hubMap = new Map<string, mongoose.Types.ObjectId>();
  for (const hub of migratedHubs) {
    if (hub.firebaseId) {
      hubMap.set(hub.firebaseId, hub._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   - ${hubMap.size} hubs mapped`);

  // 3. Get all roles: key -> MongoDB _id
  const roles = await Role.find({}).select('_id key').lean();
  const roleMap = new Map<string, mongoose.Types.ObjectId>();
  for (const role of roles) {
    roleMap.set(role.key, role._id as mongoose.Types.ObjectId);
  }
  console.log(`   - ${roleMap.size} roles mapped`);
  console.log(`   - Role keys: ${Array.from(roleMap.keys()).join(', ')}`);

  // Process users and their roles
  // Group by (hubId, userId) to handle multiple roles per hub
  const membershipMap = new Map<
    string,
    {
      hubId: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      roleIds: Set<mongoose.Types.ObjectId>;
      status: HubMemberStatus;
      joinedAt?: Date;
      invitedAt?: Date;
      invitedBy?: mongoose.Types.ObjectId;
    }
  >();

  let skipped = 0;
  let count = 0;
  let usersWithRoles = 0;

  for (const [firebaseUserId, fbUser] of users) {
    if (count >= options.limit) break;

    if (!fbUser.roles || fbUser.roles.length === 0) {
      count++;
      continue;
    }

    usersWithRoles++;
    const mongoUserId = userMap.get(firebaseUserId);
    if (!mongoUserId) {
      skipped++;
      count++;
      continue;
    }

    for (const fbRole of fbUser.roles) {
      if (!fbRole.hubId || !fbRole.role) {
        skipped++;
        continue;
      }

      const mongoHubId = hubMap.get(fbRole.hubId);
      if (!mongoHubId) {
        skipped++;
        continue;
      }

      // Map role key - 'admin' in Firebase is actually 'owner' for hub creators
      let roleKey = fbRole.role.toLowerCase();
      // If hubId matches the user's own Firebase ID, they're the owner
      if (fbRole.hubId === firebaseUserId && roleKey === 'admin') {
        roleKey = 'owner';
      }

      const mongoRoleId = roleMap.get(roleKey);
      if (!mongoRoleId) {
        // Try without mapping
        const fallbackRoleId = roleMap.get('member');
        if (!fallbackRoleId) {
          skipped++;
          continue;
        }
      }

      const memberKey = `${mongoHubId.toString()}-${mongoUserId.toString()}`;

      if (!membershipMap.has(memberKey)) {
        membershipMap.set(memberKey, {
          hubId: mongoHubId,
          userId: mongoUserId,
          roleIds: new Set(),
          status: mapFirebaseStatus(fbRole.status),
          joinedAt: fbRole.joinedDate ? new Date(fbRole.joinedDate) : undefined,
          invitedAt:
            fbRole.invitedDate || fbRole.createdDate
              ? new Date((fbRole.invitedDate || fbRole.createdDate) as number)
              : undefined,
          invitedBy: fbRole.addedBy ? userMap.get(fbRole.addedBy) : undefined,
        });
      }

      const membership = membershipMap.get(memberKey);
      if (!membership) continue;
      const fallbackRole = roleMap.get('member');
      const finalRoleId = mongoRoleId || fallbackRole;
      if (!finalRoleId) continue;
      membership.roleIds.add(finalRoleId);

      // Update status to most "active" one if we have multiple entries
      const newStatus = mapFirebaseStatus(fbRole.status);
      if (newStatus === HubMemberStatus.ACTIVE) {
        membership.status = HubMemberStatus.ACTIVE;
      }
    }

    count++;
  }

  console.log(`   Users with roles: ${usersWithRoles}`);
  console.log(`   Unique memberships: ${membershipMap.size}`);
  console.log(`   Skipped (no match): ${skipped}`);

  // Convert to array for insertion
  const membersToMigrate: Record<string, unknown>[] = [];
  for (const membership of membershipMap.values()) {
    membersToMigrate.push({
      hubId: membership.hubId,
      userId: membership.userId,
      roleIds: Array.from(membership.roleIds),
      status: membership.status,
      joinedAt: membership.joinedAt,
      invitedAt: membership.invitedAt,
      invitedBy: membership.invitedBy,
      createdAt: membership.joinedAt || membership.invitedAt || new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`   Valid memberships to migrate: ${membersToMigrate.length}`);

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${membersToMigrate.length} HubMember records`);
    if (membersToMigrate[0]) {
      console.log('\n   Sample HubMember:', JSON.stringify(membersToMigrate[0], null, 2));
    }

    // Show role distribution
    const roleDistribution = new Map<string, number>();
    for (const member of membersToMigrate) {
      const roleIds = member.roleIds as mongoose.Types.ObjectId[];
      for (const roleId of roleIds) {
        const roleKey =
          Array.from(roleMap.entries()).find(([, id]) => id.equals(roleId))?.[0] || 'unknown';
        roleDistribution.set(roleKey, (roleDistribution.get(roleKey) || 0) + 1);
      }
    }
    console.log('\n   Role distribution:');
    for (const [role, count] of roleDistribution) {
      console.log(`     - ${role}: ${count}`);
    }

    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   🧹 Cleaning up existing HubMembers (--force)...');
    const existingCount = await HubMember.countDocuments();
    console.log(`      Deleting ${existingCount} existing hub members...`);
    await HubMember.deleteMany({});
    console.log('      ✅ Cleanup complete');
  }

  // Insert using Mongoose insertMany
  console.log(`\n   📦 Bulk inserting ${membersToMigrate.length} hub members...`);
  let migrated = 0;
  let errors = 0;

  try {
    const result = await HubMember.insertMany(membersToMigrate, { ordered: false });
    migrated = result.length;
    console.log(`   ✅ Hub members inserted: ${migrated}`);
  } catch (error: any) {
    migrated = error.insertedDocs?.length || 0;
    errors = error.writeErrors?.length || 0;
    console.log(`   ⚠️  Hub members: ${migrated} inserted, ${errors} errors`);
    if (error.writeErrors && error.writeErrors.length > 0) {
      for (const err of error.writeErrors.slice(0, 3)) {
        const msg = err.errmsg || String(err);
        console.log(`      - ${msg.slice(0, 100)}`);
      }
    }
  }

  return { migrated, skipped, errors };
}

async function migrateToMongoDB(
  users: Map<string, FirebaseUser>,
  options: MigrationOptions,
): Promise<void> {
  console.log('\n💾 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  try {
    const result = await migrateHubMembers(users, options);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Migrated: ${result.migrated}`);
    console.log(`   Skipped:  ${result.skipped}`);
    console.log(`   Errors:   ${result.errors}`);

    if (!options.dryRun) {
      const totalMembers = await HubMember.countDocuments();
      console.log('\n✅ Final counts in DB:');
      console.log(`   Total HubMembers: ${totalMembers}`);

      // Show role distribution
      const roleStats = await HubMember.aggregate([
        { $unwind: '$roleIds' },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleIds',
            foreignField: '_id',
            as: 'role',
          },
        },
        { $unwind: '$role' },
        { $group: { _id: '$role.key', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\n   Role distribution:');
      for (const stat of roleStats) {
        console.log(`     - ${stat._id}: ${stat.count}`);
      }
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    limit: 100000,
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
  };

  // Parse limit
  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (limitArg) {
    options.limit = Number.parseInt(limitArg.split('=')[1] || '100000', 10);
  }

  const isMigrate = args.includes('--migrate');

  console.log('🚀 HubMember Migration Tool');
  console.log('='.repeat(60));
  console.log(`   Mode:     ${options.dryRun ? 'Dry Run' : isMigrate ? 'Migrate' : 'Analyze'}`);
  console.log(`   Limit:    ${options.limit}`);
  console.log(`   Force:    ${options.force}`);
  console.log('='.repeat(60));

  try {
    // Load data from JSON files
    console.log('\n📂 Loading data from JSON file...');
    const users = loadUsersData();
    console.log(`   Loaded ${users.size} users`);

    if (isMigrate || options.dryRun) {
      await migrateToMongoDB(users, options);
    } else {
      // Just analyze
      console.log('\n📋 ANALYSIS:');
      let usersWithRoles = 0;
      let totalRoles = 0;
      const roleTypes = new Map<string, number>();

      for (const [, user] of users) {
        if (user.roles && user.roles.length > 0) {
          usersWithRoles++;
          totalRoles += user.roles.length;
          for (const role of user.roles) {
            if (role.role) {
              roleTypes.set(role.role, (roleTypes.get(role.role) || 0) + 1);
            }
          }
        }
      }

      console.log(`   Users with roles: ${usersWithRoles}`);
      console.log(`   Total role entries: ${totalRoles}`);
      console.log('\n   Role types:');
      for (const [role, count] of roleTypes) {
        console.log(`     - ${role}: ${count}`);
      }
      console.log('\nUse --migrate to migrate data or --dry-run to preview changes');
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

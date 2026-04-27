#!/usr/bin/env tsx

/**
 * Migration Script: Firebase users -> MongoDB User
 *
 * This script migrates users from Firebase JSON dump to MongoDB User collection.
 * It reads from data/migrations/users_data.json.
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-users.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-users.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-users.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-users.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { AuthProvider, User, UserStatus } from '../../src/core/models/User';

// =============================================================================
// TYPES - Based on actual Firebase data structure
// =============================================================================

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseRole {
  hubId?: string;
  role?: string;
  joinedDate?: number;
  status?: string;
}

interface FirebaseUser {
  email?: string;
  name?: string;
  phoneNumber?: string | null;
  profileUrl?: string;
  coverPic?: string;
  currency?: string;
  timeZone?: string;
  isGuestSignup?: boolean;
  isEligibleForLearnerPass?: boolean;
  hasUsedFirstTimeLearnerPass?: boolean;
  emailVerified?: boolean;
  status?: string;
  createdDate?: FirebaseTimestamp;
  lastActive?: FirebaseTimestamp;
  // Stripe
  stripeCustomerId?: string;
  stripeCustomers?: Record<string, string>; // { myr: "cus_xxx", usd: "cus_yyy" }
  connectedAccountId?: string;
  // Hub relations
  roles?: FirebaseRole[];
  relatedHubs?: string[];
  // Subscription
  planId?: string;
  subscriptionId?: string;
  // Expert
  expertise?: string;
  profileCompletionStatus?: string;
  // Other
  isJoinedByInvitation?: boolean;
  isCreatedFromForum?: boolean;
  uid?: string;
  displayName?: string | null;
  photoURL?: string | null;
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
// TRANSFORMATION
// =============================================================================

function firebaseTimestampToDate(timestamp?: FirebaseTimestamp): Date | undefined {
  if (!timestamp || !timestamp._seconds) return undefined;
  return new Date(timestamp._seconds * 1000);
}

function transformFirebaseUserToUser(
  firebaseId: string,
  fbUser: FirebaseUser,
): Record<string, unknown> | null {
  // Skip users without email
  if (!fbUser.email) {
    return null;
  }

  // Determine stripeCustomerId - use direct field or first from stripeCustomers map
  let stripeCustomerId = fbUser.stripeCustomerId;
  if (!stripeCustomerId && fbUser.stripeCustomers) {
    // Get first customer ID from the map
    const customerIds = Object.values(fbUser.stripeCustomers);
    stripeCustomerId = customerIds[0];
  }

  // Map status
  const mapStatus = (): UserStatus => {
    if (fbUser.status === 'inactive') return UserStatus.INACTIVE;
    if (fbUser.status === 'suspended') return UserStatus.SUSPENDED;
    return UserStatus.ACTIVE;
  };

  // Get profile photo
  const profilePhoto = fbUser.profileUrl || fbUser.photoURL || undefined;

  // Get name - fallback to email prefix if no name, ensure min length 2
  let name: string = fbUser.name || fbUser.displayName || fbUser.email.split('@')[0] || 'User';
  if (name.length < 2) {
    name = name.padEnd(2, '_'); // Pad short names to meet min length
  }

  // Build user document
  const user: Record<string, unknown> = {
    // Firebase ID for migration tracking
    firebaseId,
    firebaseUid: firebaseId, // Also set firebaseUid for auth compatibility

    // Basic Info
    email: fbUser.email.toLowerCase().trim(),
    name: name.trim() || 'User',
    status: mapStatus(),
    profilePhoto,
    phoneNumber: fbUser.phoneNumber || undefined,
    emailVerified: fbUser.emailVerified || false,

    // Learner Profile
    coverPhoto: fbUser.coverPic || undefined,

    // Auth
    authProviders: [AuthProvider.FIREBASE],

    // User Profile
    currency: fbUser.currency?.toUpperCase() || 'MYR',
    timeZone: fbUser.timeZone || 'Asia/Kuala_Lumpur',
    isGuestSignup: fbUser.isGuestSignup || false,

    // Expert fields
    professionalTitle: fbUser.expertise || undefined,

    // Stripe
    stripeCustomerId: stripeCustomerId || undefined,

    // Timestamps
    createdAt: firebaseTimestampToDate(fbUser.createdDate) || new Date(),
    updatedAt: new Date(),
    lastLoginAt: firebaseTimestampToDate(fbUser.lastActive) || undefined,
  };

  return user;
}

// =============================================================================
// MIGRATION
// =============================================================================

async function migrateUsers(
  users: Map<string, FirebaseUser>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log(`\n📥 Processing ${users.size} users...`);

  const usersToMigrate: Record<string, unknown>[] = [];
  let skipped = 0;

  let count = 0;
  for (const [firebaseUid, fbUser] of users) {
    if (count >= options.limit) break;

    const user = transformFirebaseUserToUser(firebaseUid, fbUser);
    if (user) {
      usersToMigrate.push(user);
    } else {
      skipped++;
    }
    count++;
  }

  console.log(`   Valid users: ${usersToMigrate.length}`);
  console.log(`   Skipped (no email): ${skipped}`);

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${usersToMigrate.length} User records`);
    console.log('   Sample:', JSON.stringify(usersToMigrate[0], null, 2));
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup: Delete all existing users if --force is used
  if (options.force) {
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`\n   🧹 Cleaning up users table (--force)...`);
      console.log(`      Deleting ${existingCount} existing users...`);
      await User.deleteMany({});
      console.log(`      ✅ Cleanup complete`);
    }
  } else {
    // Check for existing records by firebaseId
    const firebaseIds = usersToMigrate.map((u) => u.firebaseId as string);
    const existingById = await User.countDocuments({ firebaseId: { $in: firebaseIds } });

    // Check for existing records by email
    const emails = usersToMigrate.map((u) => u.email as string);
    const existingByEmail = await User.countDocuments({ email: { $in: emails } });

    if (existingById > 0 || existingByEmail > 0) {
      console.log(`   ⚠️  Existing records found. Use --force to overwrite.`);
      console.log(`     - ${existingById} by firebaseId`);
      console.log(`     - ${existingByEmail} by email`);
    }
  }

  let migrated = 0;
  let errors = 0;

  // Bulk insert for performance
  console.log(`\n   📦 Bulk inserting ${usersToMigrate.length} users...`);

  try {
    const result = await User.insertMany(usersToMigrate, {
      ordered: false, // Continue on error
      rawResult: true,
    });
    migrated = result.insertedCount;
    console.log(`   ✅ Bulk insert complete: ${migrated} inserted`);
  } catch (error) {
    const bulkError = error as {
      insertedDocs?: unknown[];
      writeErrors?: Array<{ errmsg: string }>;
    };
    migrated = bulkError.insertedDocs?.length || 0;
    errors = bulkError.writeErrors?.length || 0;

    console.log(`   ⚠️  Bulk insert completed with errors`);
    console.log(`      Inserted: ${migrated}`);
    console.log(`      Errors: ${errors}`);

    // Show first few errors
    if (bulkError.writeErrors && bulkError.writeErrors.length > 0) {
      console.log(`   Sample errors:`);
      for (const writeErr of bulkError.writeErrors.slice(0, 3)) {
        console.log(`      - ${writeErr.errmsg}`);
      }
    }
  }

  console.log(`   ✅ User: ${migrated} migrated, ${errors} errors`);
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
    // Migrate Users
    const result = await migrateUsers(users, options);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Migrated: ${result.migrated}`);
    console.log(`   Skipped:  ${result.skipped}`);
    console.log(`   Errors:   ${result.errors}`);

    if (!options.dryRun) {
      const totalUsers = await User.countDocuments();
      const migratedUsers = await User.countDocuments({ firebaseId: { $exists: true } });
      console.log('\n✅ Final counts in DB:');
      console.log(`   Total Users:    ${totalUsers}`);
      console.log(`   Migrated Users: ${migratedUsers}`);
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

  console.log('🚀 Users Migration Tool');
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
      let withEmail = 0;
      let withStripe = 0;
      let withRoles = 0;
      let withRelatedHubs = 0;

      for (const [_, user] of users) {
        if (user.email) withEmail++;
        if (user.stripeCustomerId || user.stripeCustomers) withStripe++;
        if (user.roles && user.roles.length > 0) withRoles++;
        if (user.relatedHubs && user.relatedHubs.length > 0) withRelatedHubs++;
      }

      console.log(`   Users with email:       ${withEmail}`);
      console.log(`   Users with Stripe:      ${withStripe}`);
      console.log(`   Users with roles:       ${withRoles}`);
      console.log(`   Users with relatedHubs: ${withRelatedHubs}`);
      console.log('\nUse --migrate to migrate data or --dry-run to preview changes');
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

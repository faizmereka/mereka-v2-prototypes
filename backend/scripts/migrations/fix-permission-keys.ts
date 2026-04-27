/**
 * Migration: Fix Permission Keys Case
 *
 * This migration updates permission keys in the database from lowercase to camelCase
 * to match the PERMISSIONS constant.
 *
 * Example: 'booking.managecalendar' -> 'booking.manageCalendar'
 *
 * Run: npx tsx scripts/migrations/fix-permission-keys.ts
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

// Permission key mapping: lowercase -> camelCase
const PERMISSION_KEY_FIXES: Record<string, string> = {
  // Booking
  'booking.managecalendar': 'booking.manageCalendar',

  // Job
  'job.viewposts': 'job.viewPosts',
  'job.createpost': 'job.createPost',
  'job.editpost': 'job.editPost',
  'job.deletepost': 'job.deletePost',
  'job.publishpost': 'job.publishPost',
  'job.viewapplications': 'job.viewApplications',
  'job.manageoffers': 'job.manageOffers',
  'job.viewcontracts': 'job.viewContracts',
  'job.managemilestones': 'job.manageMilestones',
  'job.approvemilestones': 'job.approveMilestones',

  // Profile
  'profile.managemedia': 'profile.manageMedia',

  // Team
  'team.editroles': 'team.editRoles',
  'team.managepermissions': 'team.managePermissions',

  // Financial
  'financial.viewdashboard': 'financial.viewDashboard',
  'financial.viewtransactions': 'financial.viewTransactions',
  'financial.downloadstatements': 'financial.downloadStatements',
  'financial.requestwithdrawal': 'financial.requestWithdrawal',
  'financial.managebilling': 'financial.manageSubscription',
  'financial.managepayouts': 'financial.managePayouts',

  // Communication
  'communication.viewchats': 'communication.viewChats',
  'communication.sendmessages': 'communication.sendMessages',
  'communication.viewreviews': 'communication.viewReviews',
  'communication.respondreviews': 'communication.respondReviews',
  'communication.managenotifications': 'communication.manageNotifications',

  // Settings
  'settings.managesecurity': 'settings.manageSecurity',
  'settings.manageintegrations': 'settings.manageIntegrations',
};

async function fixPermissionKeys() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database connection not established');
    process.exit(1);
  }

  // 1. Fix Permission collection
  console.log('\n--- Fixing Permission collection ---');
  const permissionsCollection = db.collection('permissions');

  for (const [oldKey, newKey] of Object.entries(PERMISSION_KEY_FIXES)) {
    const result = await permissionsCollection.updateMany(
      { key: oldKey },
      { $set: { key: newKey } },
    );
    if (result.modifiedCount > 0) {
      console.log(`  Updated ${result.modifiedCount} permissions: ${oldKey} -> ${newKey}`);
    }
  }

  // 2. Fix HubMember.permissions array (custom permissions)
  console.log('\n--- Fixing HubMember.permissions arrays ---');
  const hubMembersCollection = db.collection('hubmembers');

  // Find all hub members with custom permissions
  const membersWithPermissions = await hubMembersCollection
    .find({ permissions: { $exists: true, $ne: null } })
    .toArray();

  let membersUpdated = 0;
  for (const member of membersWithPermissions) {
    if (!Array.isArray(member.permissions)) continue;

    let updated = false;
    const newPermissions = member.permissions.map((perm: string) => {
      const lowerPerm = perm.toLowerCase();
      if (PERMISSION_KEY_FIXES[lowerPerm]) {
        updated = true;
        return PERMISSION_KEY_FIXES[lowerPerm];
      }
      return perm;
    });

    if (updated) {
      await hubMembersCollection.updateOne(
        { _id: member._id },
        { $set: { permissions: newPermissions } },
      );
      membersUpdated++;
    }
  }
  console.log(`  Updated ${membersUpdated} hub members with custom permissions`);

  // 3. Summary
  console.log('\n--- Migration Complete ---');
  console.log('Permission keys have been updated from lowercase to camelCase.');
  console.log('Please restart your backend server to pick up the changes.');

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

fixPermissionKeys().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

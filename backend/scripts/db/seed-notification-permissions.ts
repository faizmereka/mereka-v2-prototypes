#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { ROLE_PERMISSIONS } from '../../src/core/constants/permissions';
import { DEFAULT_PERMISSIONS, Permission } from '../../src/core/models/Permission';
import { Role } from '../../src/core/models/Role';

/**
 * Seed script for notification permissions
 * Adds notification-related permissions and updates role mappings
 */

// Notification permissions to seed
const notificationPermissions = DEFAULT_PERMISSIONS.filter((p) =>
  p.key.startsWith('notification.'),
);

async function seedNotificationPermissions() {
  try {
    console.log('🔔 Starting notification permissions seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed Notification Permissions
    console.log('🔐 Seeding notification permissions...');
    let created = 0;
    let updated = 0;

    for (const perm of notificationPermissions) {
      const result = await Permission.findOneAndUpdate(
        { key: perm.key },
        {
          ...perm,
          isActive: true,
        },
        { upsert: true, new: true },
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        console.log(`   ✅ Created: ${perm.key}`);
        created++;
      } else {
        console.log(`   🔄 Updated: ${perm.key}`);
        updated++;
      }
    }

    console.log(`\n📊 Permissions Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);

    // Update system roles with notification permissions
    console.log('\n👥 Updating system roles with notification permissions...');

    const roleUpdates = [
      { key: 'owner', permissions: ROLE_PERMISSIONS.owner },
      { key: 'admin', permissions: ROLE_PERMISSIONS.admin },
      { key: 'expert', permissions: ROLE_PERMISSIONS.expert },
      { key: 'member', permissions: ROLE_PERMISSIONS.member },
      { key: 'collaborator', permissions: ROLE_PERMISSIONS.collaborator },
    ];

    // Get all permissions from database
    const allPermissions = await Permission.find({ isActive: true });
    const permissionMap = new Map<string, mongoose.Types.ObjectId>();
    for (const permission of allPermissions) {
      permissionMap.set(permission.key, permission._id as mongoose.Types.ObjectId);
    }

    for (const roleData of roleUpdates) {
      const role = await Role.findOne({ key: roleData.key, isSystemRole: true });
      if (!role) {
        console.log(`   ⚠️  Role "${roleData.key}" not found, skipping`);
        continue;
      }

      // Get permission IDs for this role
      const permissionIds = roleData.permissions
        .map((key) => permissionMap.get(key))
        .filter((id): id is mongoose.Types.ObjectId => id !== undefined);

      // Update role permissions
      role.permissions = permissionIds;
      await role.save();

      console.log(`   ✅ Updated role: ${roleData.key} (${permissionIds.length} permissions)`);
    }

    console.log('\n✅ Notification permissions seed completed successfully!\n');

    // Display notification permissions
    console.log('🔔 Notification Permissions:');
    for (const perm of notificationPermissions) {
      console.log(`   - ${perm.key}: ${perm.name}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run seed
seedNotificationPermissions();

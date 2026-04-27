#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { DEFAULT_PERMISSIONS, Permission } from '../../src/core/models/Permission';
import { DEFAULT_SYSTEM_ROLES, Role } from '../../src/core/models/Role';

/**
 * Seed script for roles and permissions
 * Populates the database with system roles and permissions
 */

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing system permissions and roles
    console.log('🗑️  Clearing existing system permissions and roles...');
    await Promise.all([
      Permission.deleteMany({ isSystemPermission: true }),
      Role.deleteMany({ isSystemRole: true }),
    ]);
    console.log('✅ Cleared existing data\n');

    // Seed Permissions
    console.log('🔐 Seeding permissions...');
    await Permission.insertMany(DEFAULT_PERMISSIONS, {
      ordered: false,
    }).catch((error) => {
      // Handle duplicate key errors (permissions already exist)
      if (error.code === 11000) {
        console.log('⚠️  Some permissions already exist, skipping duplicates');
        return [];
      }
      throw error;
    });

    // Get all permissions from database (including existing ones)
    const allPermissions = await Permission.find({ isSystemPermission: true });
    console.log(`✅ Permissions in database: ${allPermissions.length}`);

    // Create permission key to ID mapping
    const permissionMap = new Map<string, mongoose.Types.ObjectId>();
    for (const permission of allPermissions) {
      permissionMap.set(permission.key, permission._id as mongoose.Types.ObjectId);
    }
    console.log(`📋 Permission keys mapped: ${permissionMap.size}\n`);

    // Seed Roles
    console.log('👥 Seeding system roles...');
    let rolesCreated = 0;
    let rolesSkipped = 0;

    for (const roleData of DEFAULT_SYSTEM_ROLES) {
      // Map permission keys to IDs
      const permissionIds = roleData.permissionKeys
        .map((key) => {
          const id = permissionMap.get(key);
          if (!id) {
            console.log(`⚠️  Permission key "${key}" not found in database`);
          }
          return id;
        })
        .filter((id): id is mongoose.Types.ObjectId => id !== undefined);

      console.log(
        `   Mapping ${roleData.name}: ${roleData.permissionKeys.length} keys → ${permissionIds.length} IDs`,
      );

      // Check if role already exists
      const existingRole = await Role.findOne({
        key: roleData.key,
        scope: roleData.scope,
        hubId: null,
      });

      if (existingRole) {
        console.log(`⚠️  Role "${roleData.name}" already exists, skipping`);
        rolesSkipped++;
        continue;
      }

      // Create role
      await Role.create({
        key: roleData.key,
        name: roleData.name,
        description: roleData.description,
        permissions: permissionIds,
        scope: roleData.scope,
        isSystemRole: roleData.isSystemRole,
        isActive: true,
      });

      console.log(`✅ Created role: ${roleData.name} (${permissionIds.length} permissions)`);
      rolesCreated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Permissions: ${allPermissions.length} total`);
    console.log(`   Roles created: ${rolesCreated}`);
    console.log(`   Roles skipped: ${rolesSkipped}`);
    console.log('\n✅ Database seed completed successfully!\n');

    // Display role details
    console.log('🎭 System Roles:');
    const roles = await Role.find({ isSystemRole: true }).populate('permissions');
    for (const role of roles) {
      console.log(`   - ${role.name} (${role.key}): ${role.permissions.length} permissions`);
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
seedDatabase();

#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { AdminRole, AdminUser } from '../../src/core/models/AdminUser';
import { adminUserService } from '../../src/core/services/admin/users';

/**
 * Seed script for creating the first super admin user
 *
 * Usage:
 *   npm run db:seed:admin
 *   npm run db:seed:admin -- --email=admin@example.com --password=SecurePass123
 *
 * Environment variables (optional):
 *   ADMIN_EMAIL - Default admin email
 *   ADMIN_PASSWORD - Default admin password
 *   ADMIN_NAME - Default admin name
 */

// Default admin credentials (override with env vars or CLI args)
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@mereka.io',
  password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  name: process.env.ADMIN_NAME || 'Super Admin',
};

// Parse CLI arguments
function parseArgs(): { email?: string; password?: string; name?: string; force?: boolean } {
  const args: { email?: string; password?: string; name?: string; force?: boolean } = {};

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--email=')) {
      args.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      args.password = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      args.name = arg.split('=')[1];
    } else if (arg === '--force') {
      args.force = true;
    }
  }

  return args;
}

async function seedAdmin() {
  const args = parseArgs();

  const adminData = {
    email: args.email || DEFAULT_ADMIN.email,
    password: args.password || DEFAULT_ADMIN.password,
    name: args.name || DEFAULT_ADMIN.name,
  };

  try {
    console.log('\n🔐 Admin User Seeder\n');
    console.log('='.repeat(50));

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ email: adminData.email.toLowerCase() });

    if (existingAdmin && !args.force) {
      console.log('\n⚠️  Admin user already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log('\n💡 Use --force flag to recreate the admin user');
      console.log('   Example: npm run db:seed:admin -- --force\n');

      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete existing admin if force flag is set
    if (existingAdmin && args.force) {
      console.log('\n🗑️  Removing existing admin user...');
      await AdminUser.deleteOne({ email: adminData.email.toLowerCase() });
      console.log('✅ Existing admin removed');
    }

    // Check if any super admin exists
    const hasAnySuperAdmin = await AdminUser.findOne({ role: AdminRole.SUPER_ADMIN });

    // Create admin user
    console.log('\n👤 Creating super admin user...');

    const admin = await adminUserService.createAdminUser({
      email: adminData.email,
      password: adminData.password,
      name: adminData.name,
      role: AdminRole.SUPER_ADMIN,
    });

    // If this is the first admin or force flag is used, don't require password change
    if (!hasAnySuperAdmin || args.force) {
      await AdminUser.findByIdAndUpdate(admin._id, { requirePasswordChange: false });
    }

    console.log('✅ Super admin created successfully!\n');
    console.log('='.repeat(50));
    console.log('\n📋 Admin Details:');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Name:     ${admin.name}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`   Status:   ${admin.status}`);
    console.log(`   ID:       ${admin._id}`);

    console.log('\n🔑 Login Credentials:');
    console.log(`   Email:    ${adminData.email}`);
    console.log(`   Password: ${adminData.password}`);

    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Change the password after first login');
    console.log('   2. Enable MFA for additional security');
    console.log('   3. Keep these credentials secure\n');

    console.log('='.repeat(50));
    console.log('\n✅ Admin seeding completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding admin:', error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run seeder
seedAdmin();

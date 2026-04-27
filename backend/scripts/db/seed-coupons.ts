#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { Coupon, CouponStatus, CouponType, DiscountType } from '../../src/core/models/Coupon';

/**
 * Seed script for creating sample coupons
 *
 * Usage:
 *   npx tsx scripts/db/seed-coupons.ts
 *   npx tsx scripts/db/seed-coupons.ts --force   # Delete and recreate all coupons
 *   npx tsx scripts/db/seed-coupons.ts --clear   # Only delete existing coupons
 *
 * This creates sample Mereka platform coupons for testing checkout functionality.
 * Hub-specific coupons should be created through the Hub Dashboard.
 */

// Sample Mereka platform coupons
const sampleCoupons = [
  // Welcome discount for new users
  {
    code: 'WELCOME20',
    name: '20% Off First Booking',
    description: 'Welcome discount for new users on their first experience or expertise booking.',
    couponType: CouponType.MEREKA,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    maxDiscount: 100, // Max RM 100 off
    minPurchase: 50, // Minimum RM 50 purchase
    scope: {
      allExperiences: true,
      allExpertise: true,
    },
    usageLimit: 10000,
    usageCount: 0,
    perUserLimit: 1, // One use per user
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: CouponStatus.ACTIVE,
  },

  // Holiday promotion
  {
    code: 'HOLIDAY50',
    name: 'RM 50 Holiday Special',
    description: 'Holiday special - RM 50 off on any booking over RM 150.',
    couponType: CouponType.MEREKA,
    discountType: DiscountType.FIXED,
    discountValue: 50,
    minPurchase: 150,
    scope: {
      allExperiences: true,
      allExpertise: true,
    },
    usageLimit: 500,
    usageCount: 0,
    perUserLimit: 2, // Max 2 uses per user
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: CouponStatus.ACTIVE,
  },

  // Experience-only discount
  {
    code: 'EXP15',
    name: '15% Off Experiences',
    description: 'Special discount on all experience bookings.',
    couponType: CouponType.MEREKA,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    maxDiscount: 75, // Max RM 75 off
    minPurchase: 0,
    scope: {
      allExperiences: true,
      allExpertise: false,
    },
    usageLimit: 2000,
    usageCount: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: CouponStatus.ACTIVE,
  },

  // Expertise-only discount
  {
    code: 'EXPERT10',
    name: '10% Off Expertise Sessions',
    description: 'Discount on all expertise consultation bookings.',
    couponType: CouponType.MEREKA,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    maxDiscount: 50, // Max RM 50 off
    minPurchase: 0,
    scope: {
      allExperiences: false,
      allExpertise: true,
    },
    usageLimit: 1500,
    usageCount: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: CouponStatus.ACTIVE,
  },

  // Big spender discount
  {
    code: 'PREMIUM25',
    name: '25% Off Premium Bookings',
    description: 'Premium discount for bookings over RM 500.',
    couponType: CouponType.MEREKA,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 25,
    maxDiscount: 200, // Max RM 200 off
    minPurchase: 500, // Minimum RM 500 purchase
    scope: {
      allExperiences: true,
      allExpertise: true,
    },
    usageLimit: 200,
    usageCount: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: CouponStatus.ACTIVE,
  },

  // Test coupon (inactive)
  {
    code: 'TEST100',
    name: 'Test Coupon - 100% Off',
    description: 'Test coupon for development purposes only. Should be inactive in production.',
    couponType: CouponType.MEREKA,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 100,
    scope: {
      allExperiences: true,
      allExpertise: true,
    },
    usageLimit: 100,
    usageCount: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: env.isProduction ? CouponStatus.INACTIVE : CouponStatus.ACTIVE,
  },

  // Subscription coupon for hub creation
  {
    code: 'NEWHUB30',
    name: '30% Off First 3 Months',
    description: 'Special discount for new hub creation - 30% off subscription for 3 months.',
    couponType: CouponType.SUBSCRIPTION,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 30,
    subscriptionMonths: 3, // Applies for 3 months
    scope: {
      allExperiences: false,
      allExpertise: false,
    },
    usageLimit: 500,
    usageCount: 0,
    perUserLimit: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: CouponStatus.ACTIVE,
  },
];

// Parse CLI arguments
function parseArgs(): { force?: boolean; clear?: boolean } {
  const args: { force?: boolean; clear?: boolean } = {};

  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') {
      args.force = true;
    } else if (arg === '--clear') {
      args.clear = true;
    }
  }

  return args;
}

async function seedCoupons() {
  const args = parseArgs();

  try {
    console.log('\n🎫 Coupon Seeder\n');
    console.log('='.repeat(50));

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing coupons
    const existingCount = await Coupon.countDocuments();
    console.log(`\n📊 Existing coupons in database: ${existingCount}`);

    // Clear only mode
    if (args.clear) {
      console.log('\n🗑️  Clearing all Mereka coupons...');
      const deleteResult = await Coupon.deleteMany({
        couponType: { $in: [CouponType.MEREKA, CouponType.SUBSCRIPTION] },
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} Mereka/Subscription coupons`);
      console.log('\n💡 Hub coupons were not affected.\n');

      await mongoose.connection.close();
      process.exit(0);
    }

    // Check for existing sample coupons
    const existingCodes = await Coupon.find({
      code: { $in: sampleCoupons.map((c) => c.code) },
    }).select('code');

    const existingCodeSet = new Set(existingCodes.map((c) => c.code));

    if (existingCodeSet.size > 0 && !args.force) {
      console.log('\n⚠️  Some sample coupons already exist:');
      for (const code of existingCodeSet) {
        console.log(`   - ${code}`);
      }
      console.log('\n💡 Use --force flag to delete and recreate all sample coupons');
      console.log('   Example: npx tsx scripts/db/seed-coupons.ts --force\n');

      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete existing sample coupons if force flag is set
    if (args.force && existingCodeSet.size > 0) {
      console.log('\n🗑️  Removing existing sample coupons...');
      await Coupon.deleteMany({
        code: { $in: sampleCoupons.map((c) => c.code) },
      });
      console.log('✅ Existing sample coupons removed');
    }

    // Create sample coupons
    console.log('\n🎫 Creating sample coupons...\n');

    let created = 0;
    let skipped = 0;

    for (const couponData of sampleCoupons) {
      if (existingCodeSet.has(couponData.code) && !args.force) {
        console.log(`   ⏭️  Skipped: ${couponData.code} (already exists)`);
        skipped++;
        continue;
      }

      await Coupon.create(couponData);
      const icon = couponData.status === CouponStatus.ACTIVE ? '✅' : '⚠️';
      console.log(`   ${icon} Created: ${couponData.code} - ${couponData.name}`);
      created++;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('\n📋 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);

    console.log('\n🎫 Sample Coupons Created:');
    console.log('');
    console.log('   | Code        | Discount    | Min Purchase | Type         |');
    console.log('   |-------------|-------------|--------------|--------------|');

    for (const c of sampleCoupons) {
      const discount =
        c.discountType === DiscountType.PERCENTAGE
          ? `${c.discountValue}%${c.maxDiscount ? ` (max RM${c.maxDiscount})` : ''}`
          : `RM ${c.discountValue}`;
      const minPurchase = c.minPurchase ? `RM ${c.minPurchase}` : 'None';
      const type = c.couponType === CouponType.SUBSCRIPTION ? 'Subscription' : 'Booking';
      console.log(
        `   | ${c.code.padEnd(11)} | ${discount.padEnd(11)} | ${minPurchase.padEnd(12)} | ${type.padEnd(12)} |`,
      );
    }

    console.log('\n💡 Tips:');
    console.log('   - Use WELCOME20 for testing 20% discount');
    console.log('   - Use TEST100 for testing 100% discount (dev only)');
    console.log('   - Use NEWHUB30 for testing subscription discount');
    console.log('   - Hub-specific coupons should be created via Hub Dashboard\n');

    console.log('='.repeat(50));
    console.log('\n✅ Coupon seeding completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding coupons:', error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run seeder
seedCoupons();

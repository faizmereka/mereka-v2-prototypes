#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { Plan, PlanStatus } from '../../src/core/models/Plan';

/**
 * Seed script for subscription plans
 * Populates the database with Scale and Soar plans
 *
 * IMPORTANT: Update the Stripe price and product IDs with your actual values from Stripe Dashboard
 */

const PLANS = [
  {
    planCode: 'scale',
    name: 'Scale',
    tagline: 'For solo experts',
    description:
      'For individuals looking to grow their services through a robust set of SAAS features, learning pathways and community resources.',
    price: 2000, // $20.00 in cents
    currency: 'USD',
    // TODO: Replace with actual Stripe IDs from your Stripe Dashboard
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID || 'price_scale_placeholder',
    stripeProductId: process.env.STRIPE_SCALE_PRODUCT_ID || 'prod_scale_placeholder',
    features: [
      'Unlimited Express Experience listings',
      '3 Platform Experience listings (visible in collections and searches)',
      'Unlimited Expertise listings',
      'Up to 3 ticket/package tiers per service listing',
      'Monthly unlimited withdrawals',
      'Learning pathways & space rentals',
      'Access to Mereka Academy resources',
      'Discounts to Mereka Space bookings resources',
    ],
    status: PlanStatus.ACTIVE,
    sortOrder: 1,
  },
  {
    planCode: 'soar',
    name: 'Soar',
    tagline: 'For growing teams',
    description:
      'For teams looking for a suite of enterprise-grade tools and support to supercharge your business and streamline how you manage your services.',
    price: 4000, // $40.00 in cents
    currency: 'USD',
    // TODO: Replace with actual Stripe IDs from your Stripe Dashboard
    stripePriceId: process.env.STRIPE_SOAR_PRICE_ID || 'price_soar_placeholder',
    stripeProductId: process.env.STRIPE_SOAR_PRODUCT_ID || 'prod_soar_placeholder',
    features: [
      'Unlimited Express & Platform Experience listings, Expertise listings, & Space listings',
      'Unlimited ticket/package tiers per service listing',
      'Unlimited Hub members',
      'Unlimited Team Members with user permissions management',
      'Customer success manager',
      'Learning pathways & space rentals',
      'Access to Mereka Academy resources',
      'Discounts to Mereka Space bookings resources',
    ],
    status: PlanStatus.ACTIVE,
    sortOrder: 2,
  },
];

async function seedPlans() {
  try {
    console.log('🌱 Starting subscription plans seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed plans
    console.log('💳 Seeding subscription plans...');
    let created = 0;
    let updated = 0;

    for (const planData of PLANS) {
      // Check if plan already exists
      const existingPlan = await Plan.findOne({ planCode: planData.planCode });

      if (existingPlan) {
        // Update existing plan
        await Plan.findOneAndUpdate(
          { planCode: planData.planCode },
          {
            ...planData,
            lastUpdatedBy: 'system-seed',
          },
        );
        console.log(`   ✏️  Updated plan: ${planData.name}`);
        updated++;
      } else {
        // Create new plan
        await Plan.create({
          ...planData,
          createdBy: 'system-seed',
          lastUpdatedBy: 'system-seed',
        });
        console.log(`   ✅ Created plan: ${planData.name}`);
        created++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Plans created: ${created}`);
    console.log(`   Plans updated: ${updated}`);
    console.log('\n✅ Subscription plans seed completed successfully!\n');

    // Display plans
    console.log('💳 Subscription Plans:');
    const plans = await Plan.find().sort({ sortOrder: 1 });
    for (const plan of plans) {
      console.log(
        `   - ${plan.name} (${plan.planCode}): $${plan.price / 100}/month - ${plan.status}`,
      );
      console.log(`     Stripe Price ID: ${plan.stripePriceId}`);
    }
    console.log('');

    // Warning about placeholder IDs
    const hasPlaceholders = plans.some(
      (p) => p.stripePriceId.includes('placeholder') || p.stripeProductId.includes('placeholder'),
    );
    if (hasPlaceholders) {
      console.log('⚠️  WARNING: Some plans have placeholder Stripe IDs!');
      console.log('   Please update them with real Stripe price/product IDs:');
      console.log('   - Set STRIPE_SCALE_PRICE_ID and STRIPE_SCALE_PRODUCT_ID in .env');
      console.log('   - Set STRIPE_SOAR_PRICE_ID and STRIPE_SOAR_PRODUCT_ID in .env');
      console.log('   - Or update directly in the database\n');
    }
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
seedPlans();

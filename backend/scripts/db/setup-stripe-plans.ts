/**
 * Setup Stripe Plans - Creates real Stripe products/prices and updates MongoDB
 *
 * Run: npx tsx scripts/db/setup-stripe-plans.ts
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';

config();

const MONGODB_URI = process.env.MONGODB_URI;
// Use Atlas account for subscription plan setup (subscriptions are always on Atlas)
const STRIPE_ATLAS_SECRET_KEY = process.env.STRIPE_ATLAS_SECRET_KEY;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

if (!STRIPE_ATLAS_SECRET_KEY) {
  console.error('STRIPE_ATLAS_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_ATLAS_SECRET_KEY);

interface PlanConfig {
  planCode: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
}

const PLANS: PlanConfig[] = [
  {
    planCode: 'scale',
    name: 'Scale Plan',
    description:
      'For individuals looking to grow their services through a robust set of SAAS features.',
    priceInCents: 2000, // $20
    currency: 'usd',
  },
  {
    planCode: 'soar',
    name: 'Soar Plan',
    description: 'For teams looking for enterprise-grade tools to supercharge your business.',
    priceInCents: 4000, // $40
    currency: 'usd',
  },
];

async function setupStripePlans(): Promise<void> {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }

  const plansCollection = db.collection('subscriptionproducts');

  for (const planConfig of PLANS) {
    console.log(`\n--- Setting up ${planConfig.name} ---`);

    // Check if plan exists in MongoDB
    const existingPlan = await plansCollection.findOne({ planCode: planConfig.planCode });
    if (!existingPlan) {
      console.log(`  Plan ${planConfig.planCode} not found in MongoDB, skipping...`);
      continue;
    }

    // Check if already has real Stripe IDs
    if (existingPlan.stripePriceId && !existingPlan.stripePriceId.includes('placeholder')) {
      console.log(`  Plan already has real Stripe price ID: ${existingPlan.stripePriceId}`);
      continue;
    }

    // Create Stripe product
    console.log(`  Creating Stripe product...`);
    const product = await stripe.products.create({
      name: planConfig.name,
      description: planConfig.description,
      metadata: {
        planCode: planConfig.planCode,
      },
    });
    console.log(`  Created product: ${product.id}`);

    // Create Stripe price (recurring monthly)
    console.log(`  Creating Stripe price...`);
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: planConfig.priceInCents,
      currency: planConfig.currency,
      recurring: {
        interval: 'month',
      },
      metadata: {
        planCode: planConfig.planCode,
      },
    });
    console.log(`  Created price: ${price.id}`);

    // Update MongoDB plan with real Stripe IDs
    console.log(`  Updating MongoDB plan...`);
    await plansCollection.updateOne(
      { planCode: planConfig.planCode },
      {
        $set: {
          stripeProductId: product.id,
          stripePriceId: price.id,
          updatedAt: new Date(),
        },
      },
    );
    console.log(`  ✅ Updated plan ${planConfig.planCode} with Stripe IDs`);
  }

  // Show final state
  console.log('\n\n=== Final Plan State ===');
  const allPlans = await plansCollection.find({}).toArray();
  for (const plan of allPlans) {
    console.log(`\n${plan.planCode}:`);
    console.log(`  stripeProductId: ${plan.stripeProductId}`);
    console.log(`  stripePriceId: ${plan.stripePriceId}`);
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

setupStripePlans().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

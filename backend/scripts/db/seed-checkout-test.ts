#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';

/**
 * Seed script for creating test data for checkout flow testing
 * Creates an experience with upcoming events and tickets
 *
 * Usage:
 *   npx tsx scripts/db/seed-checkout-test.ts
 */

async function seedCheckoutTest() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection;

  // Get a hub to associate with the experience (any hub, not just active)
  const hub = await db.collection('hubs').findOne({});
  if (!hub) {
    console.log('❌ No hub found. Please create a hub first.');
    process.exit(1);
  }
  console.log(`📍 Using hub: ${hub.hubName} (${hub._id})`);

  // Check if test experience already exists
  const existingExp = await db
    .collection('experiences')
    .findOne({ slug: 'checkout-test-experience' });
  if (existingExp) {
    console.log('⚠️ Test experience already exists. Deleting and recreating...');
    await db.collection('experiences').deleteOne({ slug: 'checkout-test-experience' });
    await db.collection('experienceevents').deleteMany({ experienceId: existingExp._id });
  }

  // Create test experience
  const experienceId = new mongoose.Types.ObjectId();
  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const eventEndDate = new Date(futureDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours after start

  const experience = {
    _id: experienceId,
    hubId: hub._id,
    userId: hub.userId,
    experienceTitle: 'Checkout Test Experience',
    slug: 'checkout-test-experience',
    summary: 'Test experience for checkout flow testing',
    description: 'This is a test experience created for checkout flow testing purposes.',
    coverPhoto: hub.logo || 'https://via.placeholder.com/800x400',
    experienceType: 'Physical',
    experienceCategory: 'Workshop',
    currency: 'MYR',
    language: 'English',
    location: {
      venueName: 'Mereka Space',
      address: '29 Jalan Riong, Bangsar',
      city: 'Kuala Lumpur',
      state: 'Federal Territory of Kuala Lumpur',
      country: 'Malaysia',
      postalCode: '59100',
    },
    ticket: [
      {
        _id: new mongoose.Types.ObjectId(),
        ticketName: 'Standard Ticket',
        ticketType: 'Paid',
        ticketPrice: 50,
        ticketDescription: 'Standard admission',
        ticketQty: 100,
        minPerOrder: 1,
        maxPerOrder: 10,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        ticketName: 'VIP Ticket',
        ticketType: 'Paid',
        ticketPrice: 100,
        ticketDescription: 'VIP admission with extras',
        ticketQty: 20,
        minPerOrder: 1,
        maxPerOrder: 5,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        ticketName: 'Free Ticket',
        ticketType: 'Free',
        ticketPrice: 0,
        ticketDescription: 'Free community ticket',
        ticketQty: 50,
        minPerOrder: 1,
        maxPerOrder: 2,
      },
    ],
    status: 'ACTIVE',
    publishStatus: 'published',
    isHubPayingFee: false,
    isFeatured: false,
    views: 0,
    questionnaire: {
      isQuestionMandatory: false,
      questionArray: [
        {
          questionLabel: 'Do you have any dietary requirements?',
          questionType: 'dropdown',
          dropDown: ['None', 'Vegetarian', 'Vegan', 'Halal', 'Other'],
        },
        {
          questionLabel: 'How did you hear about us?',
          questionType: 'multiple_choice',
          multipleChoices: ['Social Media', 'Friend', 'Google', 'Newsletter', 'Other'],
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('experiences').insertOne(experience);
  console.log(`✅ Created experience: ${experience.experienceTitle} (${experience.slug})`);

  // Create test events
  const events = [
    {
      _id: new mongoose.Types.ObjectId(),
      experienceId,
      startTime: futureDate,
      endTime: eventEndDate,
      timeZone: 'Asia/Kuala_Lumpur',
      ticketsAvailable: 170, // Total of all ticket quantities
      ticketsSold: 0,
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      experienceId,
      startTime: new Date(futureDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      endTime: new Date(futureDate.getTime() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      timeZone: 'Asia/Kuala_Lumpur',
      ticketsAvailable: 170,
      ticketsSold: 0,
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.collection('experienceevents').insertMany(events);
  console.log(`✅ Created ${events.length} events for the experience`);

  // Print checkout URL for testing
  const testEvent = events[0];
  const testTicket = experience.ticket?.[0];
  if (testEvent && testTicket) {
    console.log('\n🔗 Test Checkout URLs:');
    console.log(
      `   Standard Ticket: http://localhost:4203/experience/${experience.slug}?eventId=${testEvent._id}&tickets=${testTicket._id}:2`,
    );
    if (experience.ticket?.[1]) {
      console.log(
        `   VIP Ticket: http://localhost:4203/experience/${experience.slug}?eventId=${testEvent._id}&tickets=${experience.ticket[1]._id}:1`,
      );
    }
    if (experience.ticket?.[2]) {
      console.log(
        `   Free Ticket: http://localhost:4203/experience/${experience.slug}?eventId=${testEvent._id}&tickets=${experience.ticket[2]._id}:1`,
      );
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seedCheckoutTest().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

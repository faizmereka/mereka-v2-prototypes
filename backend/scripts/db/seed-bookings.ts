#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import {
  Booking,
  BookingStatus,
  BookingType,
  DisputeStatus,
  PayBy,
  StripePaymentStatus,
} from '../../src/core/models/Booking';
import { Experience } from '../../src/core/models/Experience';
import { ExperienceEvent } from '../../src/core/models/ExperienceEvent';
import { Expertise } from '../../src/core/models/Expertise';
import { Hub } from '../../src/core/models/Hub';
import { User } from '../../src/core/models/User';

/**
 * Seed script for creating sample booking data
 *
 * Usage:
 *   npx tsx scripts/db/seed-bookings.ts
 *   npx tsx scripts/db/seed-bookings.ts --count=100
 *   npx tsx scripts/db/seed-bookings.ts --clear
 */

// Parse CLI arguments
function parseArgs(): { count: number; clear: boolean } {
  const args = { count: 50, clear: false };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--count=')) {
      const countValue = arg.split('=')[1];
      args.count = countValue ? parseInt(countValue, 10) || 50 : 50;
    } else if (arg === '--clear') {
      args.clear = true;
    }
  }

  return args;
}

// Helper to pick weighted random status
function pickWeightedStatus<T extends { status: string; weight: number }>(dist: T[]): string {
  if (dist.length === 0) return '';
  const totalWeight = dist.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of dist) {
    random -= item.weight;
    if (random <= 0) return item.status;
  }
  return dist[0]?.status ?? '';
}

// Sample learner names
const LEARNER_NAMES = [
  'Ahmad Ismail',
  'Sarah Wong',
  'Muhammad Ali',
  'Priya Nair',
  'David Tan',
  'Fatimah Abdullah',
  'Wei Ling',
  'Raj Kumar',
  'Emily Chen',
  'Hafiz Rahman',
  'Lisa Lee',
  'Arjun Singh',
  'Mei Ling Ong',
  'Farhan Hassan',
  'Jessica Lim',
];

// Helper: Generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper: Get random item from array
function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot get random item from empty array');
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) throw new Error('Random item is undefined');
  return item;
}

// Helper: Generate random email
function generateEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  return `${cleanName}${Math.floor(Math.random() * 1000)}@${randomItem(domains)}`;
}

// Helper: Generate random phone
function generatePhone(): string {
  return `+60${Math.floor(100000000 + Math.random() * 900000000)}`;
}

// Helper: Generate learner details
function generateLearnerDetails(count: number): Array<{
  id: number;
  name: string;
  email: string;
  phone: string;
  attendance: boolean;
  isBooker: boolean;
}> {
  const learners = [];
  for (let i = 0; i < count; i++) {
    const name = randomItem(LEARNER_NAMES);
    learners.push({
      id: i + 1,
      name,
      email: generateEmail(name),
      phone: generatePhone(),
      attendance: Math.random() > 0.3,
      isBooker: i === 0,
    });
  }
  return learners;
}

// Helper: Generate selected tickets
function generateSelectedTickets(
  type: BookingType,
  learnerCount: number,
): Array<{
  id: string;
  numberOfSelectedTickets: number;
  standardRate: number;
  ticketName: string;
  ticketType: string;
}> {
  const ticketNames = {
    [BookingType.EXPERIENCE]: ['General Admission', 'VIP Pass', 'Early Bird', 'Student Discount'],
    [BookingType.EXPERTISE]: ['1-Hour Session', '2-Hour Session', 'Half Day', 'Full Day'],
    [BookingType.SPACE]: ['Hourly Rental', 'Half Day', 'Full Day', 'Weekly'],
  };

  const ticketName = randomItem(ticketNames[type]);
  const rates = [50, 100, 150, 200, 300, 500];
  const rate = randomItem(rates);

  return [
    {
      id: new mongoose.Types.ObjectId().toString(),
      numberOfSelectedTickets: learnerCount,
      standardRate: rate,
      ticketName,
      ticketType: type,
    },
  ];
}

async function seedBookings() {
  const args = parseArgs();

  try {
    console.log('\n📅 Booking Seeder\n');
    console.log('='.repeat(50));

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing bookings if flag is set
    if (args.clear) {
      console.log('\n🗑️  Clearing existing bookings...');
      const result = await Booking.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} bookings`);
    }

    // Fetch required data
    console.log('\n📊 Fetching required data...');

    const [hubs, users, experiences, expertises, events] = await Promise.all([
      Hub.find({ status: 'active' }).select('_id name').limit(10).lean(),
      User.find({ status: 'active' }).select('_id name email').limit(20).lean(),
      Experience.find({ status: 'approved' }).select('_id experienceTitle hubId').limit(20).lean(),
      Expertise.find({ status: 'published' }).select('_id title hubId').limit(20).lean(),
      ExperienceEvent.find({ status: { $in: ['completed', 'live'] } })
        .select('_id experienceId startTime endTime')
        .limit(30)
        .lean(),
    ]);

    if (hubs.length === 0) {
      console.log('\n⚠️  No active hubs found. Please seed hubs first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`   Found ${hubs.length} hubs`);
    console.log(`   Found ${users.length} users`);
    console.log(`   Found ${experiences.length} experiences`);
    console.log(`   Found ${expertises.length} expertises`);
    console.log(`   Found ${events.length} events`);

    // Generate bookings
    console.log(`\n📝 Creating ${args.count} sample bookings...`);

    const bookings: Array<mongoose.AnyObject> = [];
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    // Status distributions
    const statusDistribution = [
      { status: BookingStatus.COMPLETED, weight: 40 },
      { status: BookingStatus.ACTIVE, weight: 25 },
      { status: BookingStatus.PENDING, weight: 15 },
      { status: BookingStatus.CANCELLED, weight: 10 },
      { status: BookingStatus.REJECTED, weight: 5 },
      { status: BookingStatus.EXPIRED, weight: 5 },
    ];

    const paymentStatusDistribution = [
      { status: StripePaymentStatus.SUCCEEDED, weight: 70 },
      { status: StripePaymentStatus.PENDING, weight: 15 },
      { status: StripePaymentStatus.FAILED, weight: 10 },
      { status: StripePaymentStatus.CANCELED, weight: 5 },
    ];

    for (let i = 0; i < args.count; i++) {
      // Randomly select booking type with weighted distribution
      const experienceWeight = 50;
      const expertiseWeight = 35;
      const typeRandom = Math.random() * 100;
      let bookingType = BookingType.EXPERIENCE;
      if (typeRandom > experienceWeight + expertiseWeight) {
        bookingType = BookingType.SPACE;
      } else if (typeRandom > experienceWeight) {
        bookingType = BookingType.EXPERTISE;
      }

      // Select appropriate service and hub based on type
      let serviceId: mongoose.Types.ObjectId;
      let hubId: mongoose.Types.ObjectId;
      let eventId: mongoose.Types.ObjectId | undefined;

      if (bookingType === BookingType.EXPERIENCE && experiences.length > 0) {
        const exp = randomItem(experiences);
        serviceId = new mongoose.Types.ObjectId(exp._id.toString());
        hubId = exp.hubId
          ? new mongoose.Types.ObjectId(exp.hubId.toString())
          : new mongoose.Types.ObjectId(randomItem(hubs)._id.toString());
        // Find matching event if available
        const matchingEvent = events.find((e) => e.experienceId?.toString() === exp._id.toString());
        if (matchingEvent) {
          eventId = new mongoose.Types.ObjectId(matchingEvent._id.toString());
        }
      } else if (bookingType === BookingType.EXPERTISE && expertises.length > 0) {
        const exp = randomItem(expertises);
        serviceId = new mongoose.Types.ObjectId(exp._id.toString());
        hubId = exp.hubId
          ? new mongoose.Types.ObjectId(exp.hubId.toString())
          : new mongoose.Types.ObjectId(randomItem(hubs)._id.toString());
      } else {
        // Default to random hub for space or fallback
        const hub = randomItem(hubs);
        serviceId = new mongoose.Types.ObjectId(); // Mock service ID
        hubId = new mongoose.Types.ObjectId(hub._id.toString());
      }

      // Generate booking dates
      const bookingStartDate = randomDate(sixMonthsAgo, threeMonthsFromNow);
      const durationHours = randomItem([1, 2, 3, 4, 8]);
      const bookingEndDate = new Date(bookingStartDate.getTime() + durationHours * 60 * 60 * 1000);

      // Determine status based on dates
      let status = pickWeightedStatus(statusDistribution) as BookingStatus;
      if (bookingEndDate < now && status === BookingStatus.ACTIVE) {
        status = BookingStatus.COMPLETED;
      }
      if (bookingStartDate > now && status === BookingStatus.COMPLETED) {
        status = BookingStatus.ACTIVE;
      }

      // Generate learner details
      const learnerCount = Math.floor(Math.random() * 4) + 1;
      const learnerDetails = generateLearnerDetails(learnerCount);
      const selectedTickets = generateSelectedTickets(bookingType, learnerCount);

      // Calculate costs
      const totalCost = selectedTickets.reduce(
        (sum, t) => sum + t.standardRate * t.numberOfSelectedTickets,
        0,
      );

      // Payment status
      let stripeStatus = pickWeightedStatus(paymentStatusDistribution) as StripePaymentStatus;
      if (status === BookingStatus.CANCELLED || status === BookingStatus.REJECTED) {
        stripeStatus = randomItem([StripePaymentStatus.CANCELED, StripePaymentStatus.FAILED]);
      }
      if (status === BookingStatus.COMPLETED) {
        stripeStatus = StripePaymentStatus.SUCCEEDED;
      }

      // Calculate fees
      const platformFeeRate = 0.15;
      const platformFee = Number((totalCost * platformFeeRate).toFixed(2));
      const stripeFeeRate = 0.029;
      const stripeFee = Number((totalCost * stripeFeeRate + 1.0).toFixed(2));
      const transferAmount = Number((totalCost - platformFee - stripeFee).toFixed(2));

      // Select random user for bookedBy
      const selectedUser = users.length > 0 ? randomItem(users) : null;

      const booking = {
        bookingType,
        serviceId,
        hubId,
        bookedBy: selectedUser
          ? new mongoose.Types.ObjectId(selectedUser._id.toString())
          : undefined,
        eventId,
        bookingStartDate,
        bookingEndDate,
        timeZone: 'Asia/Kuala_Lumpur',
        learnerDetail: learnerDetails,
        selectedTickets,
        totalCost,
        currency: 'MYR',
        discountAmount: Math.random() > 0.8 ? Math.floor(totalCost * 0.1) : 0,
        platformFee,
        platformFeeRate,
        stripeFee,
        transferAmount,
        stripeFeePayBy: randomItem([PayBy.HUB, PayBy.LEARNER]),
        status,
        stripeStatus,
        disputeStatus: DisputeStatus.NONE,
        stripePaymentIntentId: `pi_seed_${new mongoose.Types.ObjectId().toString()}`,
        stripeChargeId:
          stripeStatus === StripePaymentStatus.SUCCEEDED
            ? `ch_seed_${new mongoose.Types.ObjectId().toString()}`
            : undefined,
        isFree: totalCost === 0,
        isMalaysian: Math.random() > 0.3,
        isRefunded: status === BookingStatus.CANCELLED && Math.random() > 0.5,
        refundAmount: status === BookingStatus.CANCELLED && Math.random() > 0.5 ? totalCost : 0,
        transferStatus:
          stripeStatus === StripePaymentStatus.SUCCEEDED && status === BookingStatus.COMPLETED
            ? 'paid'
            : 'pending',
        transferredAt:
          stripeStatus === StripePaymentStatus.SUCCEEDED && status === BookingStatus.COMPLETED
            ? new Date(bookingEndDate.getTime() + 24 * 60 * 60 * 1000) // 1 day after booking end
            : undefined,
        isBookingSuccessNotificationSentToExpert: stripeStatus === StripePaymentStatus.SUCCEEDED,
        isBookingSuccessNotificationSentToLearner: stripeStatus === StripePaymentStatus.SUCCEEDED,
        createdAt: new Date(bookingStartDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      };

      bookings.push(booking);
    }

    // Insert bookings
    const result = await Booking.insertMany(bookings);
    console.log(`✅ Created ${result.length} bookings`);

    // Generate summary
    const summary = {
      byType: {
        experience: bookings.filter((b) => b.bookingType === BookingType.EXPERIENCE).length,
        expertise: bookings.filter((b) => b.bookingType === BookingType.EXPERTISE).length,
        space: bookings.filter((b) => b.bookingType === BookingType.SPACE).length,
      },
      byStatus: {
        completed: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
        active: bookings.filter((b) => b.status === BookingStatus.ACTIVE).length,
        pending: bookings.filter((b) => b.status === BookingStatus.PENDING).length,
        cancelled: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
        other: bookings.filter(
          (b) =>
            ![
              BookingStatus.COMPLETED,
              BookingStatus.ACTIVE,
              BookingStatus.PENDING,
              BookingStatus.CANCELLED,
            ].includes(b.status as BookingStatus),
        ).length,
      },
      byPayment: {
        succeeded: bookings.filter((b) => b.stripeStatus === StripePaymentStatus.SUCCEEDED).length,
        pending: bookings.filter((b) => b.stripeStatus === StripePaymentStatus.PENDING).length,
        failed: bookings.filter((b) => b.stripeStatus === StripePaymentStatus.FAILED).length,
        other: bookings.filter(
          (b) =>
            ![
              StripePaymentStatus.SUCCEEDED,
              StripePaymentStatus.PENDING,
              StripePaymentStatus.FAILED,
            ].includes(b.stripeStatus as StripePaymentStatus),
        ).length,
      },
      totalRevenue: bookings
        .filter((b) => b.stripeStatus === StripePaymentStatus.SUCCEEDED)
        .reduce((sum, b) => sum + (b.totalCost as number), 0),
    };

    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    console.log('\nBy Type:');
    console.log(`   Experience: ${summary.byType.experience}`);
    console.log(`   Expertise:  ${summary.byType.expertise}`);
    console.log(`   Space:      ${summary.byType.space}`);

    console.log('\nBy Status:');
    console.log(`   Completed:  ${summary.byStatus.completed}`);
    console.log(`   Active:     ${summary.byStatus.active}`);
    console.log(`   Pending:    ${summary.byStatus.pending}`);
    console.log(`   Cancelled:  ${summary.byStatus.cancelled}`);
    console.log(`   Other:      ${summary.byStatus.other}`);

    console.log('\nBy Payment:');
    console.log(`   Succeeded:  ${summary.byPayment.succeeded}`);
    console.log(`   Pending:    ${summary.byPayment.pending}`);
    console.log(`   Failed:     ${summary.byPayment.failed}`);
    console.log(`   Other:      ${summary.byPayment.other}`);

    console.log(`\n💰 Total Revenue (Succeeded): MYR ${summary.totalRevenue.toLocaleString()}`);

    console.log('\n='.repeat(50));
    console.log('\n✅ Booking seeding completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding bookings:', error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run seeder
seedBookings();

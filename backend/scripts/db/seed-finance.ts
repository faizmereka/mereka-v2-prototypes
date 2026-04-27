#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { Hub } from '../../src/core/models/Hub';
import { PendingPayment, PendingPaymentStatus } from '../../src/core/models/PendingPayment';
import {
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../src/core/models/Transaction';
import { User } from '../../src/core/models/User';

/**
 * Seed script for creating sample finance data (transactions, pending payments)
 *
 * Usage:
 *   npx tsx scripts/db/seed-finance.ts
 *   npx tsx scripts/db/seed-finance.ts --count=100
 *   npx tsx scripts/db/seed-finance.ts --clear
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

// Sample user names
const _USER_NAMES = [
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

// Contract titles for pending payments
const CONTRACT_TITLES = [
  'Web Development Project',
  'UI/UX Design Consultation',
  'Marketing Strategy Session',
  'Data Analytics Training',
  'Mobile App Development',
  'SEO Optimization',
  'Content Writing Services',
  'Social Media Management',
  'Video Editing Project',
  'Business Consulting',
  'Financial Advisory',
  'Legal Document Review',
];

// Transaction descriptions
const TRANSACTION_DESCRIPTIONS = {
  booking_payment: [
    'Booking Payment - Art Workshop',
    'Booking Payment - Photography Class',
    'Booking Payment - Cooking Experience',
    'Booking Payment - Yoga Session',
    'Booking Payment - Music Lesson',
  ],
  milestone_fund: [
    'Milestone Payment - Phase 1',
    'Milestone Payment - Design Completion',
    'Milestone Payment - Development Sprint',
    'Milestone Payment - Testing Phase',
  ],
  withdrawal: [
    'Withdrawal to Maybank',
    'Withdrawal to CIMB Bank',
    'Withdrawal to Public Bank',
    'Withdrawal to RHB Bank',
    'Withdrawal to Hong Leong',
  ],
  refund: [
    'Booking Refund - Cancelled',
    'Booking Refund - Expert Unavailable',
    'Booking Refund - Weather Conditions',
    'Partial Refund - Service Issue',
  ],
  expert_transfer: [
    'Expert Payout - Weekly Settlement',
    'Expert Payout - Monthly Settlement',
    'Hub Payout - Commission',
    'Expert Earnings Transfer',
  ],
};

// Error messages for pending payments
const ERROR_MESSAGES = [
  'Card declined: insufficient funds',
  'Payment method expired',
  'Card authentication failed',
  'Network error during processing',
  'Bank rejected transaction',
  'Invalid card number',
  '3D Secure authentication failed',
];

// Generate reference ID for transaction
function generateReferenceId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${year}-${random}`;
}

async function seedFinance() {
  const args = parseArgs();

  try {
    console.log('\n💰 Finance Data Seeder\n');
    console.log('='.repeat(50));

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data if flag is set
    if (args.clear) {
      console.log('\n🗑️  Clearing existing finance data...');
      const [txnResult, ppResult] = await Promise.all([
        Transaction.deleteMany({}),
        PendingPayment.deleteMany({}),
      ]);
      console.log(`✅ Deleted ${txnResult.deletedCount} transactions`);
      console.log(`✅ Deleted ${ppResult.deletedCount} pending payments`);
    }

    // Fetch required data
    console.log('\n📊 Fetching required data...');

    const [hubs, users] = await Promise.all([
      Hub.find({ status: 'active' }).select('_id name').limit(10).lean(),
      User.find({ status: 'active' })
        .select('_id name email stripeConnectAccountId')
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

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    // ==================== TRANSACTIONS ====================
    console.log(`\n📝 Creating ${args.count} sample transactions...`);

    const transactions: mongoose.AnyObject[] = [];

    const transactionTypeDistribution = [
      { status: TransactionType.BOOKING_PAYMENT, weight: 40 },
      { status: TransactionType.MILESTONE_FUND, weight: 20 },
      { status: TransactionType.WITHDRAWAL, weight: 15 },
      { status: TransactionType.REFUND, weight: 10 },
      { status: TransactionType.EXPERT_TRANSFER, weight: 15 },
    ];

    const transactionStatusDistribution = [
      { status: TransactionStatus.SUCCEEDED, weight: 70 },
      { status: TransactionStatus.PENDING, weight: 15 },
      { status: TransactionStatus.FAILED, weight: 10 },
      { status: TransactionStatus.REFUNDED, weight: 5 },
    ];

    for (let i = 0; i < args.count; i++) {
      const type = pickWeightedStatus(transactionTypeDistribution) as TransactionType;
      const status = pickWeightedStatus(transactionStatusDistribution) as TransactionStatus;
      const createdAt = randomDate(sixMonthsAgo, now);

      const hub = randomItem(hubs);
      const fromUser = users.length > 0 ? randomItem(users) : null;
      const toUser =
        users.length > 1 ? randomItem(users.filter((u) => u._id !== fromUser?._id)) : fromUser;

      // Calculate amounts
      const baseAmounts = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000];
      const amount = randomItem(baseAmounts);
      const platformFeeRate = 0.15;
      const platformFee = Number((amount * platformFeeRate).toFixed(2));
      const stripeFeeRate = 0.029;
      const stripeFee = Number((amount * stripeFeeRate + 1.0).toFixed(2));
      const transferAmount = Number((amount - platformFee - stripeFee).toFixed(2));

      // Determine direction based on type
      let direction = TransactionDirection.INBOUND;
      if (type === TransactionType.WITHDRAWAL || type === TransactionType.REFUND) {
        direction = TransactionDirection.OUTBOUND;
      } else if (type === TransactionType.EXPERT_TRANSFER) {
        direction = TransactionDirection.INTERNAL;
      }

      // Pick description based on type
      const descriptionKey = type.includes('booking')
        ? 'booking_payment'
        : type.includes('milestone')
          ? 'milestone_fund'
          : type.includes('withdrawal')
            ? 'withdrawal'
            : type.includes('refund')
              ? 'refund'
              : 'expert_transfer';
      const descriptions = TRANSACTION_DESCRIPTIONS[
        descriptionKey as keyof typeof TRANSACTION_DESCRIPTIONS
      ] || ['Transaction'];
      const description = randomItem(descriptions);

      const transaction = {
        type,
        direction,
        sourceModel:
          type === TransactionType.WITHDRAWAL ? SourceModel.WITHDRAWAL : SourceModel.BOOKING,
        sourceId: new mongoose.Types.ObjectId(),
        referenceId: generateReferenceId(),
        amount,
        currency: 'MYR',
        platformFee,
        platformFeeRate,
        stripeFee,
        transferAmount,
        fromUserId: fromUser ? new mongoose.Types.ObjectId(fromUser._id.toString()) : undefined,
        toUserId: toUser ? new mongoose.Types.ObjectId(toUser._id.toString()) : undefined,
        hubId: new mongoose.Types.ObjectId(hub._id.toString()),
        serviceType: randomItem(['experience', 'expertise', 'space', 'milestone'] as const),
        serviceId: new mongoose.Types.ObjectId(),
        stripePaymentIntentId:
          status !== TransactionStatus.PENDING ? `pi_seed_${i}_${Date.now()}` : undefined,
        stripeChargeId:
          status === TransactionStatus.SUCCEEDED ? `ch_seed_${i}_${Date.now()}` : undefined,
        status,
        description,
        createdAt,
        updatedAt: createdAt,
      };

      transactions.push(transaction);
    }

    const txnResult = await Transaction.insertMany(transactions);
    console.log(`✅ Created ${txnResult.length} transactions`);

    // ==================== PENDING PAYMENTS ====================
    const pendingPaymentCount = Math.ceil(args.count * 0.15);
    console.log(`\n📝 Creating ${pendingPaymentCount} sample pending payments...`);

    const pendingPayments: mongoose.AnyObject[] = [];

    const pendingStatusDistribution = [
      { status: PendingPaymentStatus.PENDING, weight: 50 },
      { status: PendingPaymentStatus.PROCESSING, weight: 20 },
      { status: PendingPaymentStatus.FAILED, weight: 20 },
      { status: PendingPaymentStatus.COMPLETED, weight: 10 },
    ];

    for (let i = 0; i < pendingPaymentCount; i++) {
      const status = pickWeightedStatus(pendingStatusDistribution) as PendingPaymentStatus;
      const createdAt = randomDate(sixMonthsAgo, now);
      const hub = randomItem(hubs);
      const expert = users.length > 0 ? randomItem(users) : null;
      const learner =
        users.length > 1 ? randomItem(users.filter((u) => u._id !== expert?._id)) : expert;

      const amounts = [100000, 180000, 250000, 320000, 500000, 800000]; // in cents
      const amount = randomItem(amounts);
      const totalHours = randomItem([4, 8, 12, 16, 20, 40]);
      const contractTitle = randomItem(CONTRACT_TITLES);

      const startDate = randomDate(sixMonthsAgo, now);
      const endDate = new Date(startDate.getTime() + totalHours * 60 * 60 * 1000);

      const retryCount = status === PendingPaymentStatus.FAILED ? 5 : Math.floor(Math.random() * 4);
      const nextRetryAt = new Date(createdAt.getTime() + (retryCount + 1) * 3600000); // +1 hour per retry

      const pendingPayment = {
        contractId: new mongoose.Types.ObjectId().toString(),
        jobId: new mongoose.Types.ObjectId().toString(),
        applicationId: new mongoose.Types.ObjectId().toString(),
        hubId: hub._id.toString(),
        expertId: expert ? expert._id.toString() : new mongoose.Types.ObjectId().toString(),
        learnerId: learner ? learner._id.toString() : new mongoose.Types.ObjectId().toString(),
        paymentMethodId: `pm_seed_${i}_${Date.now()}`,
        stripeCustomerId: `cus_seed_${i}`,
        amount,
        currency: 'MYR',
        totalHours,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        contractTitle,
        description: `Payment for ${totalHours} hours of ${contractTitle.toLowerCase()}`,
        workLogIds: [],
        status,
        retryCount,
        maxRetries: 5,
        nextRetryAt,
        lastError:
          status !== PendingPaymentStatus.COMPLETED ? randomItem(ERROR_MESSAGES) : undefined,
        lastAttempt:
          retryCount > 0 ? new Date(createdAt.getTime() + retryCount * 3600000) : undefined,
        failedAt: status === PendingPaymentStatus.FAILED ? new Date() : undefined,
        processedAt: status === PendingPaymentStatus.COMPLETED ? new Date() : undefined,
        paymentIntentId:
          status === PendingPaymentStatus.COMPLETED ? `pi_seed_success_${i}` : undefined,
        createdAt,
        updatedAt: createdAt,
      };

      pendingPayments.push(pendingPayment);
    }

    const ppResult = await PendingPayment.insertMany(pendingPayments);
    console.log(`✅ Created ${ppResult.length} pending payments`);

    // ==================== SUMMARY ====================
    const transactionSummary = {
      byType: {
        booking_payment: transactions.filter((t) => t.type === TransactionType.BOOKING_PAYMENT)
          .length,
        milestone_fund: transactions.filter((t) => t.type === TransactionType.MILESTONE_FUND)
          .length,
        withdrawal: transactions.filter((t) => t.type === TransactionType.WITHDRAWAL).length,
        refund: transactions.filter((t) => t.type === TransactionType.REFUND).length,
        expert_transfer: transactions.filter((t) => t.type === TransactionType.EXPERT_TRANSFER)
          .length,
      },
      byStatus: {
        succeeded: transactions.filter((t) => t.status === TransactionStatus.SUCCEEDED).length,
        pending: transactions.filter((t) => t.status === TransactionStatus.PENDING).length,
        failed: transactions.filter((t) => t.status === TransactionStatus.FAILED).length,
        refunded: transactions.filter((t) => t.status === TransactionStatus.REFUNDED).length,
      },
      totalRevenue: transactions
        .filter(
          (t) =>
            t.status === TransactionStatus.SUCCEEDED &&
            t.direction === TransactionDirection.INBOUND,
        )
        .reduce((sum, t) => sum + (t.amount as number), 0),
    };

    const pendingPaymentSummary = {
      byStatus: {
        pending: pendingPayments.filter((p) => p.status === PendingPaymentStatus.PENDING).length,
        processing: pendingPayments.filter((p) => p.status === PendingPaymentStatus.PROCESSING)
          .length,
        failed: pendingPayments.filter((p) => p.status === PendingPaymentStatus.FAILED).length,
        completed: pendingPayments.filter((p) => p.status === PendingPaymentStatus.COMPLETED)
          .length,
      },
      totalPendingAmount: pendingPayments
        .filter(
          (p) =>
            p.status === PendingPaymentStatus.PENDING ||
            p.status === PendingPaymentStatus.PROCESSING,
        )
        .reduce((sum, p) => sum + (p.amount as number) / 100, 0), // Convert from cents
    };

    console.log('\n📊 Summary:');
    console.log('='.repeat(50));

    console.log('\n💳 Transactions:');
    console.log(`   By Type:`);
    console.log(`     Booking Payments: ${transactionSummary.byType.booking_payment}`);
    console.log(`     Milestone Funds:  ${transactionSummary.byType.milestone_fund}`);
    console.log(`     Withdrawals:      ${transactionSummary.byType.withdrawal}`);
    console.log(`     Refunds:          ${transactionSummary.byType.refund}`);
    console.log(`     Expert Transfers: ${transactionSummary.byType.expert_transfer}`);
    console.log(`   By Status:`);
    console.log(`     Succeeded: ${transactionSummary.byStatus.succeeded}`);
    console.log(`     Pending:   ${transactionSummary.byStatus.pending}`);
    console.log(`     Failed:    ${transactionSummary.byStatus.failed}`);
    console.log(`     Refunded:  ${transactionSummary.byStatus.refunded}`);
    console.log(`   💰 Total Revenue: MYR ${transactionSummary.totalRevenue.toLocaleString()}`);

    console.log('\n⏳ Pending Payments:');
    console.log(`   Pending:    ${pendingPaymentSummary.byStatus.pending}`);
    console.log(`   Processing: ${pendingPaymentSummary.byStatus.processing}`);
    console.log(`   Failed:     ${pendingPaymentSummary.byStatus.failed}`);
    console.log(`   Completed:  ${pendingPaymentSummary.byStatus.completed}`);
    console.log(
      `   💰 Total Pending: MYR ${pendingPaymentSummary.totalPendingAmount.toLocaleString()}`,
    );

    console.log('\n='.repeat(50));
    console.log('\n✅ Finance data seeding completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding finance data:', error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run seeder
seedFinance();

#!/usr/bin/env tsx

/**
 * Migration Script: Generate Transaction records from existing data
 *
 * This script creates Transaction records from:
 * 1. Existing Booking records (experience, expertise, space)
 * 2. Existing ContractPayment records (milestone, timelog)
 * 3. Firebase bookingTransaction data (for legacy records not yet migrated)
 *
 * Usage:
 *   npx tsx scripts/migrations/migrate-transactions.ts --dry-run
 *   npx tsx scripts/migrations/migrate-transactions.ts --migrate
 *   npx tsx scripts/migrations/migrate-transactions.ts --migrate --force
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Booking, BookingStatus, StripePaymentStatus } from '../../src/core/models/Booking';
import {
  ContractPayment,
  ContractPaymentStatus,
  ContractPaymentType,
} from '../../src/core/models/ContractPayment';
import { Hub } from '../../src/core/models/Hub';
import {
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../src/core/models/Transaction';
import { User } from '../../src/core/models/User';

// =============================================================================
// TYPES
// =============================================================================

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseBookingTransaction {
  serviceType: string;
  serviceId?: string;
  eventId?: string;
  hubId?: string;
  bookedBy?: string;
  totalCost?: number;
  currency?: string;
  status?: string;
  merekaStatus?: string;
  stripeTransactionId?: string;
  stripeResponse?: Record<string, unknown>;
  totalStripeFee?: number;
  merekaFees?: number;
  transferAmount?: number;
  isMoneyTransferred?: boolean | string;
  createdDate?: FirebaseTimestamp;
  isRefunded?: boolean;
  refundAmount?: number;
  // Job-specific
  jobId?: string;
  contractId?: string;
  applicationId?: string;
  totalHours?: number;
}

interface MigrationOptions {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadBookingTransactionData(): Map<string, FirebaseBookingTransaction> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'bookingTransaction_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('   Booking transaction data not found, skipping Firebase migration');
    return new Map();
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseBookingTransaction>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function parseTimestamp(ts?: FirebaseTimestamp): Date | undefined {
  if (!ts || !ts._seconds) return undefined;
  return new Date(ts._seconds * 1000);
}

function mapTransactionStatus(stripeStatus?: string, isRefunded?: boolean): TransactionStatus {
  if (isRefunded) return TransactionStatus.REFUNDED;
  const s = stripeStatus?.toLowerCase() || '';
  if (s === 'succeeded') return TransactionStatus.SUCCEEDED;
  if (s === 'failed') return TransactionStatus.FAILED;
  if (s === 'canceled' || s === 'cancelled') return TransactionStatus.CANCELLED;
  if (s === 'processing') return TransactionStatus.PROCESSING;
  return TransactionStatus.PENDING;
}

function mapTransactionType(serviceType: string, isTransfer?: boolean): TransactionType {
  if (isTransfer) return TransactionType.EXPERT_TRANSFER;
  switch (serviceType) {
    case 'experience':
    case 'expertise':
    case 'space':
      return TransactionType.BOOKING_PAYMENT;
    case 'jobContract':
      return TransactionType.MILESTONE_FUND;
    case 'jobPaymentLink':
      return TransactionType.TIMELOG_PAYMENT;
    default:
      return TransactionType.BOOKING_PAYMENT;
  }
}

function mapServiceType(
  serviceType: string,
): 'experience' | 'expertise' | 'space' | 'milestone' | 'timelog' | undefined {
  switch (serviceType) {
    case 'experience':
      return 'experience';
    case 'expertise':
      return 'expertise';
    case 'space':
      return 'space';
    case 'jobContract':
      return 'milestone';
    case 'jobPaymentLink':
      return 'timelog';
    default:
      return undefined;
  }
}

function generateReferenceId(date: Date): string {
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${year}-${random}`;
}

// =============================================================================
// MIGRATION FROM MONGODB BOOKINGS
// =============================================================================

async function migrateFromBookings(
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log('\n📦 Creating Transactions from Bookings...');

  // Find bookings that don't have transactions yet
  const bookings = await Booking.find({
    stripeStatus: StripePaymentStatus.SUCCEEDED,
  })
    .limit(options.limit)
    .lean();

  console.log(`   Found ${bookings.length} successful bookings`);

  // Check existing transactions to avoid duplicates
  const existingSourceIds = new Set(
    (await Transaction.find({ sourceModel: SourceModel.BOOKING }).select('sourceId').lean()).map(
      (t) => t.sourceId.toString(),
    ),
  );

  const bulkOps: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings) {
    try {
      // Skip if transaction already exists
      if (existingSourceIds.has(booking._id.toString())) {
        skipped++;
        continue;
      }

      const transaction: Record<string, unknown> = {
        firebaseId: booking.firebaseId,
        type: TransactionType.BOOKING_PAYMENT,
        direction: TransactionDirection.INBOUND,
        sourceModel: SourceModel.BOOKING,
        sourceId: booking._id,
        referenceId: generateReferenceId(booking.createdAt || new Date()),
        amount: booking.totalCost || 0,
        currency: booking.currency || 'MYR',
        platformFee: booking.platformFee || 0,
        platformFeeRate: booking.platformFeeRate || 0.15,
        stripeFee: booking.stripeFee || 0,
        transferAmount: booking.transferAmount || 0,
        fromUserId: booking.bookedBy,
        hubId: booking.hubId,
        serviceType: booking.bookingType,
        serviceId: booking.serviceId,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        stripeChargeId: booking.stripeChargeId,
        status:
          booking.status === BookingStatus.CANCELLED
            ? TransactionStatus.CANCELLED
            : booking.refundAmount
              ? TransactionStatus.REFUNDED
              : TransactionStatus.SUCCEEDED,
        stripeStatus: booking.stripeStatus,
        refundedAmount: booking.refundAmount,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };

      // Add transfer info if money was transferred
      if (booking.transferAmount && booking.transferAmount > 0) {
        transaction.transferredAt = booking.updatedAt;
        transaction.transferMethod = 'stripe_connect';
      }

      bulkOps.push(transaction);
    } catch (error) {
      errors++;
      console.error(`   ❌ Error processing booking ${booking._id}:`, error);
    }
  }

  // Bulk insert
  if (!options.dryRun && bulkOps.length > 0) {
    console.log(`   📥 Bulk inserting ${bulkOps.length} transactions from bookings...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      try {
        const result = await Transaction.insertMany(batch, { ordered: false });
        console.log(
          `     Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkOps.length / BATCH_SIZE)} (${result.length} docs)`,
        );
      } catch (err) {
        console.error(`     ❌ Insert error:`, err instanceof Error ? err.message : err);
      }
    }
  }

  return { migrated: bulkOps.length, skipped, errors };
}

// =============================================================================
// MIGRATION FROM MONGODB CONTRACT PAYMENTS
// =============================================================================

async function migrateFromContractPayments(
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log('\n📦 Creating Transactions from Contract Payments...');

  // Find contract payments
  const payments = await ContractPayment.find({
    status: {
      $in: [
        ContractPaymentStatus.FUNDED,
        ContractPaymentStatus.RELEASED,
        ContractPaymentStatus.REFUNDED,
      ],
    },
  })
    .limit(options.limit)
    .lean();

  console.log(`   Found ${payments.length} contract payments`);

  // Check existing transactions to avoid duplicates
  const existingSourceIds = new Set(
    (
      await Transaction.find({ sourceModel: SourceModel.CONTRACT_PAYMENT })
        .select('sourceId')
        .lean()
    ).map((t) => t.sourceId.toString()),
  );

  const bulkOps: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let errors = 0;

  for (const payment of payments) {
    try {
      // Skip if transaction already exists
      if (existingSourceIds.has(payment._id.toString())) {
        skipped++;
        continue;
      }

      const transactionType =
        payment.paymentType === ContractPaymentType.MILESTONE
          ? TransactionType.MILESTONE_FUND
          : TransactionType.TIMELOG_PAYMENT;

      // Cast to access legacy fields that might exist in old DB records
      const paymentRecord = payment as Record<string, unknown>;
      const transaction: Record<string, unknown> = {
        firebaseId: payment.firebaseId,
        type: transactionType,
        direction: TransactionDirection.INBOUND,
        sourceModel: SourceModel.CONTRACT_PAYMENT,
        sourceId: payment._id,
        referenceId: generateReferenceId(payment.createdAt || new Date()),
        amount: payment.amount || 0,
        currency: payment.currency || 'MYR',
        platformFee: (paymentRecord.platformFee as number) || 0,
        platformFeeRate: (paymentRecord.platformFeeRate as number) || 0,
        stripeFee: payment.stripeFee || 0,
        transferAmount: payment.transferAmount || 0,
        fromUserId: payment.clientId,
        toUserId: payment.expertId,
        hubId: payment.hubId,
        serviceType:
          payment.paymentType === ContractPaymentType.MILESTONE ? 'milestone' : 'timelog',
        serviceId: payment.milestoneId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        status:
          payment.status === ContractPaymentStatus.REFUNDED
            ? TransactionStatus.REFUNDED
            : payment.status === ContractPaymentStatus.FAILED
              ? TransactionStatus.FAILED
              : TransactionStatus.SUCCEEDED,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };

      // Add transfer info if released
      if (payment.status === ContractPaymentStatus.RELEASED && payment.transferredAt) {
        transaction.transferredAt = payment.transferredAt;
        transaction.transferMethod = 'stripe_connect';
      }

      bulkOps.push(transaction);
    } catch (error) {
      errors++;
      console.error(`   ❌ Error processing payment ${payment._id}:`, error);
    }
  }

  // Bulk insert
  if (!options.dryRun && bulkOps.length > 0) {
    console.log(`   📥 Bulk inserting ${bulkOps.length} transactions from contract payments...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      try {
        const result = await Transaction.insertMany(batch, { ordered: false });
        console.log(
          `     Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkOps.length / BATCH_SIZE)} (${result.length} docs)`,
        );
      } catch (err) {
        console.error(`     ❌ Insert error:`, err instanceof Error ? err.message : err);
      }
    }
  }

  return { migrated: bulkOps.length, skipped, errors };
}

// =============================================================================
// MIGRATION FROM FIREBASE (for records not in Booking/ContractPayment)
// =============================================================================

async function migrateFromFirebase(
  bookingData: Map<string, FirebaseBookingTransaction>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log('\n📦 Creating Transactions from Firebase bookingTransaction...');
  console.log(`   Found ${bookingData.size} Firebase records`);

  // Build lookup maps
  const [hubMap, userMap] = await Promise.all([buildHubMap(), buildUserMap()]);
  console.log(`   - ${hubMap.size} hubs mapped`);
  console.log(`   - ${userMap.size} users mapped`);

  // Get existing firebaseIds in transactions to avoid duplicates
  const existingFirebaseIds = new Set(
    (
      await Transaction.find({ firebaseId: { $exists: true, $ne: null } })
        .select('firebaseId')
        .lean()
    ).map((t) => t.firebaseId),
  );

  // Get booking firebaseIds (already migrated to Booking model)
  const bookingFirebaseIds = new Set(
    (
      await Booking.find({ firebaseId: { $exists: true, $ne: null } })
        .select('firebaseId')
        .lean()
    ).map((b) => b.firebaseId),
  );

  // Get contract payment firebaseIds (already migrated)
  const contractPaymentFirebaseIds = new Set(
    (
      await ContractPayment.find({ firebaseId: { $exists: true, $ne: null } })
        .select('firebaseId')
        .lean()
    ).map((cp) => cp.firebaseId),
  );

  const bulkOps: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let errors = 0;
  let count = 0;

  const skipReasons = new Map<string, number>();

  for (const [firebaseId, tx] of bookingData) {
    if (count >= options.limit) break;
    count++;

    try {
      // Skip if already exists as transaction
      if (existingFirebaseIds.has(firebaseId)) {
        skipped++;
        skipReasons.set('already_exists', (skipReasons.get('already_exists') || 0) + 1);
        continue;
      }

      // Skip experience/expertise/space if migrated to Booking
      if (['experience', 'expertise', 'space'].includes(tx.serviceType || '')) {
        if (bookingFirebaseIds.has(firebaseId)) {
          skipped++;
          skipReasons.set('in_booking', (skipReasons.get('in_booking') || 0) + 1);
          continue;
        }
      }

      // Skip job payments if migrated to ContractPayment
      if (['jobContract', 'jobPaymentLink'].includes(tx.serviceType || '')) {
        if (contractPaymentFirebaseIds.has(firebaseId)) {
          skipped++;
          skipReasons.set('in_contract_payment', (skipReasons.get('in_contract_payment') || 0) + 1);
          continue;
        }
      }

      // Must have hub
      const hubMongoId = tx.hubId ? hubMap.get(tx.hubId) : null;
      if (!hubMongoId) {
        skipped++;
        skipReasons.set('no_hub', (skipReasons.get('no_hub') || 0) + 1);
        continue;
      }

      // Must have valid cost
      if (!tx.totalCost || tx.totalCost <= 0) {
        skipped++;
        skipReasons.set('no_cost', (skipReasons.get('no_cost') || 0) + 1);
        continue;
      }

      const createdAt = parseTimestamp(tx.createdDate) || new Date();
      const userMongoId = tx.bookedBy ? userMap.get(tx.bookedBy) : null;

      const transaction: Record<string, unknown> = {
        firebaseId,
        type: mapTransactionType(tx.serviceType || 'experience'),
        direction: TransactionDirection.INBOUND,
        sourceModel: SourceModel.BOOKING_TRANSACTION,
        sourceId: new mongoose.Types.ObjectId(), // Generate new ID for legacy source
        referenceId: generateReferenceId(createdAt),
        amount: tx.totalCost,
        currency: tx.currency?.toUpperCase() || 'MYR',
        platformFee: tx.merekaFees || 0,
        platformFeeRate: 0.15,
        stripeFee: tx.totalStripeFee || 0,
        transferAmount: tx.transferAmount || 0,
        ...(userMongoId && { fromUserId: new mongoose.Types.ObjectId(userMongoId) }),
        hubId: new mongoose.Types.ObjectId(hubMongoId),
        serviceType: mapServiceType(tx.serviceType || 'experience'),
        stripePaymentIntentId: tx.stripeTransactionId,
        status: mapTransactionStatus(tx.status, tx.isRefunded),
        stripeStatus: tx.status,
        ...(tx.isRefunded && tx.refundAmount && { refundedAmount: tx.refundAmount }),
        createdAt,
        updatedAt: createdAt,
      };

      // Add transfer info
      if (tx.isMoneyTransferred === true || tx.isMoneyTransferred === 'true') {
        transaction.transferredAt = createdAt;
        transaction.transferMethod = 'stripe_connect';
      }

      bulkOps.push(transaction);
    } catch (error) {
      errors++;
      console.error(`   ❌ Error processing ${firebaseId}:`, error);
    }
  }

  // Log skip reasons
  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, reasonCount] of skipReasons) {
      console.log(`     - ${reason}: ${reasonCount}`);
    }
  }

  // Bulk insert
  if (!options.dryRun && bulkOps.length > 0) {
    console.log(`\n   📥 Bulk inserting ${bulkOps.length} transactions from Firebase...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      try {
        const result = await Transaction.insertMany(batch, { ordered: false });
        console.log(
          `     Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkOps.length / BATCH_SIZE)} (${result.length} docs)`,
        );
      } catch (err) {
        console.error(`     ❌ Insert error:`, err instanceof Error ? err.message : err);
      }
    }
  }

  return { migrated: bulkOps.length, skipped, errors };
}

// =============================================================================
// LOOKUP MAP BUILDERS
// =============================================================================

async function buildHubMap(): Promise<Map<string, string>> {
  const hubs = await Hub.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const map = new Map<string, string>();
  for (const hub of hubs) {
    if (hub.firebaseId) {
      map.set(hub.firebaseId, (hub._id as mongoose.Types.ObjectId).toString());
    }
  }
  return map;
}

async function buildUserMap(): Promise<Map<string, string>> {
  const users = await User.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const map = new Map<string, string>();
  for (const user of users) {
    if (user.firebaseId) {
      map.set(user.firebaseId, (user._id as mongoose.Types.ObjectId).toString());
    }
  }
  return map;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    limit: Number.MAX_SAFE_INTEGER,
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
  };

  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (limitArg) {
    options.limit = Number.parseInt(limitArg.split('=')[1] ?? '0', 10);
  }

  console.log('🚀 Transaction Migration');
  console.log(`   Mode: ${options.dryRun ? 'DRY RUN' : 'MIGRATE'}`);
  console.log(`   Force: ${options.force}`);
  console.log(
    `   Limit: ${options.limit === Number.MAX_SAFE_INTEGER ? 'unlimited' : options.limit}`,
  );

  // Connect to MongoDB
  await mongoose.connect(env.MONGODB_URI);
  console.log('\n✅ Connected to MongoDB');

  // Clear existing if force
  if (options.force && !options.dryRun) {
    console.log('\n🗑️  Clearing existing migrated transactions...');
    const result = await Transaction.deleteMany({ firebaseId: { $exists: true } });
    console.log(`   Deleted ${result.deletedCount} transactions with firebaseId`);
  }

  // Load Firebase data
  console.log('\n📂 Loading Firebase data...');
  const bookingData = loadBookingTransactionData();
  console.log(`   Loaded ${bookingData.size} Firebase booking transactions`);

  // 1. Migrate from existing Bookings
  const bookingResult = await migrateFromBookings(options);
  console.log(
    `\n📊 From Bookings: ${bookingResult.migrated} created, ${bookingResult.skipped} skipped, ${bookingResult.errors} errors`,
  );

  // 2. Migrate from existing ContractPayments
  const contractResult = await migrateFromContractPayments(options);
  console.log(
    `\n📊 From Contract Payments: ${contractResult.migrated} created, ${contractResult.skipped} skipped, ${contractResult.errors} errors`,
  );

  // 3. Migrate from Firebase (legacy records)
  const firebaseResult = await migrateFromFirebase(bookingData, options);
  console.log(
    `\n📊 From Firebase: ${firebaseResult.migrated} created, ${firebaseResult.skipped} skipped, ${firebaseResult.errors} errors`,
  );

  // Summary
  const totalMigrated = bookingResult.migrated + contractResult.migrated + firebaseResult.migrated;
  console.log('\n✅ Migration complete!');
  console.log(`   Total transactions created: ${totalMigrated}`);
  console.log(`     - From Bookings: ${bookingResult.migrated}`);
  console.log(`     - From Contract Payments: ${contractResult.migrated}`);
  console.log(`     - From Firebase: ${firebaseResult.migrated}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

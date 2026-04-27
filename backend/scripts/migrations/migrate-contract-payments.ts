#!/usr/bin/env tsx

/**
 * Migration Script: Firebase bookingTransaction (job payments) + pendingPayments -> MongoDB
 *
 * This script migrates:
 * 1. jobContract/jobPaymentLink from bookingTransaction -> ContractPayment
 * 2. pendingPayments -> PendingPayment
 *
 * Usage:
 *   npx tsx scripts/migrations/migrate-contract-payments.ts --dry-run
 *   npx tsx scripts/migrations/migrate-contract-payments.ts --migrate
 *   npx tsx scripts/migrations/migrate-contract-payments.ts --migrate --force
 *   npx tsx scripts/migrations/migrate-contract-payments.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Contract } from '../../src/core/models/Contract';
import {
  ContractPayment,
  ContractPaymentStatus,
  ContractPaymentType,
  EscrowStatus,
} from '../../src/core/models/ContractPayment';
import { Hub } from '../../src/core/models/Hub';
import { Job } from '../../src/core/models/Job';
import { JobProposal } from '../../src/core/models/JobProposal';
import { Milestone } from '../../src/core/models/Milestone';
import { PendingPayment, PendingPaymentStatus } from '../../src/core/models/PendingPayment';
import { User } from '../../src/core/models/User';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  jobId?: string;
  applicationId?: string;
  contractId?: string;
  eventId?: string; // For milestones, this is the Firebase milestone ID
  hubId?: string;
  bookedBy?: string;
  totalCost?: number;
  currency?: string;
  status?: string;
  merekaStatus?: string;
  stripeTransactionId?: string;
  stripeResponse?: Record<string, unknown>;
  totalStripeFee?: number;
  stripeFeePayBy?: string;
  transferAmount?: number;
  isMoneyTransferred?: boolean | string;
  createdDate?: FirebaseTimestamp;
  // Timelog specific
  totalHours?: number;
  startDateTime?: string;
  endDateTime?: string;
  workLogIds?: string[];
  learnerDetail?: Array<{ name?: string; email?: string }>;
}

interface FirebasePendingPayment {
  contractId: string;
  jobId: string;
  applicationId: string;
  expertId: string;
  learnerId: string;
  stripeCustomerId: string;
  stripeAccount?: string;
  amount: number;
  currency: string;
  totalHours: number;
  startDateTime: string;
  endDateTime: string;
  contractTitle: string;
  description?: string;
  workLogIds?: string[];
  paymentMethodId: string;
  status: string;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: FirebaseTimestamp;
  lastError?: string;
  lastAttempt?: FirebaseTimestamp;
  failedAt?: FirebaseTimestamp;
  processedAt?: FirebaseTimestamp;
  paymentIntentId?: string;
  createdAt?: FirebaseTimestamp;
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
    throw new Error(`Booking transaction data not found: ${jsonPath}`);
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseBookingTransaction>;
  return new Map(Object.entries(data));
}

function loadPendingPaymentsData(): Map<string, FirebasePendingPayment> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'pendingPayments_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('   Pending payments data not found, skipping');
    return new Map();
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebasePendingPayment>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function parseTimestamp(ts?: FirebaseTimestamp): Date | undefined {
  if (!ts || !ts._seconds) return undefined;
  return new Date(ts._seconds * 1000);
}

function mapPaymentStatus(
  status?: string,
  isMoneyTransferred?: boolean | string,
): ContractPaymentStatus {
  const s = status?.toLowerCase() || '';
  if (s === 'succeeded' || s === 'completed') {
    if (isMoneyTransferred === true || isMoneyTransferred === 'true') {
      return ContractPaymentStatus.RELEASED;
    }
    return ContractPaymentStatus.FUNDED;
  }
  if (s === 'failed') return ContractPaymentStatus.FAILED;
  if (s === 'cancelled' || s === 'canceled') return ContractPaymentStatus.CANCELLED;
  if (s === 'refunded') return ContractPaymentStatus.REFUNDED;
  if (s === 'processing') return ContractPaymentStatus.PROCESSING;
  return ContractPaymentStatus.PENDING;
}

function mapEscrowStatus(status?: string): EscrowStatus {
  const s = status?.toLowerCase() || '';
  if (s === 'succeeded') return EscrowStatus.CAPTURED;
  if (s === 'requires_payment_method') return EscrowStatus.REQUIRES_PAYMENT_METHOD;
  if (s === 'requires_confirmation') return EscrowStatus.REQUIRES_CONFIRMATION;
  if (s === 'requires_action') return EscrowStatus.REQUIRES_ACTION;
  if (s === 'processing') return EscrowStatus.PROCESSING;
  if (s === 'canceled') return EscrowStatus.CANCELED;
  if (s === 'failed') return EscrowStatus.FAILED;
  return EscrowStatus.NONE;
}

function mapPendingPaymentStatus(status?: string): PendingPaymentStatus {
  const s = status?.toLowerCase() || '';
  if (s === 'completed' || s === 'success') return PendingPaymentStatus.COMPLETED;
  if (s === 'failed') return PendingPaymentStatus.FAILED;
  if (s === 'processing') return PendingPaymentStatus.PROCESSING;
  return PendingPaymentStatus.PENDING;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// =============================================================================
// MIGRATION - CONTRACT PAYMENTS
// =============================================================================

async function migrateContractPayments(
  bookingData: Map<string, FirebaseBookingTransaction>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log('\n📦 Migrating Contract Payments...');

  // Filter for job payments only
  const jobPayments = new Map<string, FirebaseBookingTransaction>();
  for (const [id, tx] of bookingData) {
    if (tx.serviceType === 'jobContract' || tx.serviceType === 'jobPaymentLink') {
      jobPayments.set(id, tx);
    }
  }
  console.log(`   Found ${jobPayments.size} job payment records`);

  // Build lookup maps
  const [hubMap, userMap, contractMap, jobMap, milestoneMap] = await Promise.all([
    buildHubMap(),
    buildUserMap(),
    buildContractMap(),
    buildJobMap(),
    buildMilestoneMap(),
  ]);

  console.log(`   - ${hubMap.size} hubs mapped`);
  console.log(`   - ${userMap.size} users mapped`);
  console.log(`   - ${contractMap.size} contracts mapped`);
  console.log(`   - ${jobMap.size} jobs mapped`);
  console.log(`   - ${milestoneMap.size} milestones mapped`);

  const bulkOps: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let errors = 0;
  let count = 0;

  const skipReasons = new Map<string, number>();

  for (const [firebaseId, tx] of jobPayments) {
    if (count >= options.limit) break;
    count++;

    try {
      // Determine payment type
      const isTimelog = tx.totalHours !== undefined && tx.totalHours > 0;
      const paymentType = isTimelog ? ContractPaymentType.TIMELOG : ContractPaymentType.MILESTONE;

      // Get contract MongoDB ID
      const contractFirebaseId = tx.contractId || tx.serviceId;
      const contractData = contractFirebaseId ? contractMap.get(contractFirebaseId) : null;
      if (!contractData) {
        skipped++;
        skipReasons.set('no_contract', (skipReasons.get('no_contract') || 0) + 1);
        continue;
      }

      // Get job MongoDB ID
      const jobFirebaseId = tx.jobId;
      const jobMongoId = jobFirebaseId ? jobMap.get(jobFirebaseId) : null;
      if (!jobMongoId) {
        skipped++;
        skipReasons.set('no_job', (skipReasons.get('no_job') || 0) + 1);
        continue;
      }

      // Get hub MongoDB ID
      const hubMongoId = tx.hubId ? hubMap.get(tx.hubId) : null;
      if (!hubMongoId) {
        skipped++;
        skipReasons.set('no_hub', (skipReasons.get('no_hub') || 0) + 1);
        continue;
      }

      // Get client and expert from contract
      const clientId = contractData.clientId;
      const expertId = contractData.expertId;
      if (!clientId || !expertId) {
        skipped++;
        skipReasons.set('no_client_expert', (skipReasons.get('no_client_expert') || 0) + 1);
        continue;
      }

      // Build payment document
      const payment: Record<string, unknown> = {
        firebaseId,
        paymentType,
        contractId: contractData._id,
        jobId: new mongoose.Types.ObjectId(jobMongoId),
        hubId: new mongoose.Types.ObjectId(hubMongoId),
        clientId,
        expertId,
        amount: tx.totalCost || 0,
        currency: tx.currency?.toUpperCase() || 'MYR',
        status: mapPaymentStatus(tx.status, tx.isMoneyTransferred),
        escrowStatus: mapEscrowStatus(tx.status),
        platformFee: 0,
        platformFeeRate: 0.15,
        stripeFee: tx.totalStripeFee || 0,
        transferAmount: tx.transferAmount || 0,
        stripePaymentIntentId: tx.stripeTransactionId,
        stripeResponse: tx.stripeResponse,
        createdAt: parseTimestamp(tx.createdDate) || new Date(),
        updatedAt: parseTimestamp(tx.createdDate) || new Date(),
      };

      // Add timelog-specific fields
      if (isTimelog) {
        const startDate = tx.startDateTime ? new Date(tx.startDateTime) : new Date();
        const endDate = tx.endDateTime ? new Date(tx.endDateTime) : new Date();
        payment.hoursWorked = tx.totalHours;
        payment.weekStartDate = startDate;
        payment.weekEndDate = endDate;
        payment.weekNumber = getWeekNumber(startDate);
        payment.year = startDate.getFullYear();
      }

      // Add milestone reference for milestone payments
      if (!isTimelog && tx.eventId) {
        const milestoneMongoId = milestoneMap.get(tx.eventId);
        if (milestoneMongoId) {
          payment.milestoneId = new mongoose.Types.ObjectId(milestoneMongoId);
        }
      }

      // Set transfer status
      if (tx.isMoneyTransferred === true || tx.isMoneyTransferred === 'true') {
        payment.transferStatus = 'paid';
        payment.transferredAt = parseTimestamp(tx.createdDate);
      }

      bulkOps.push(payment);
    } catch (error) {
      errors++;
      console.error(`   ❌ Error processing ${firebaseId}:`, error);
    }
  }

  // Log skip reasons
  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, count] of skipReasons) {
      console.log(`     - ${reason}: ${count}`);
    }
  }

  // Bulk insert
  if (!options.dryRun && bulkOps.length > 0) {
    console.log(`\n   📥 Bulk inserting ${bulkOps.length} contract payments...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      await ContractPayment.insertMany(batch, { ordered: false });
      console.log(
        `     Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkOps.length / BATCH_SIZE)}`,
      );
    }
  }

  return { migrated: bulkOps.length, skipped, errors };
}

// =============================================================================
// MIGRATION - PENDING PAYMENTS
// =============================================================================

async function migratePendingPayments(
  pendingData: Map<string, FirebasePendingPayment>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log('\n📦 Migrating Pending Payments...');
  console.log(`   Found ${pendingData.size} pending payment records`);

  // Build lookup maps
  const [contractMap, jobMap, userMap, proposalMap] = await Promise.all([
    buildContractMap(),
    buildJobMap(),
    buildUserMap(),
    buildProposalMap(),
  ]);
  console.log(
    `   - ${contractMap.size} contracts, ${jobMap.size} jobs, ${userMap.size} users, ${proposalMap.size} proposals mapped`,
  );

  const bulkOps: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let errors = 0;
  let count = 0;
  const skipReasons = new Map<string, number>();

  for (const [firebaseId, pp] of pendingData) {
    if (count >= options.limit) break;
    count++;

    try {
      // Convert Firebase IDs to MongoDB ObjectIds
      const contractData = contractMap.get(pp.contractId);
      if (!contractData) {
        skipped++;
        skipReasons.set('no_contract', (skipReasons.get('no_contract') || 0) + 1);
        continue;
      }

      const jobMongoId = jobMap.get(pp.jobId);
      if (!jobMongoId) {
        skipped++;
        skipReasons.set('no_job', (skipReasons.get('no_job') || 0) + 1);
        continue;
      }

      const expertMongoId = userMap.get(pp.expertId);
      if (!expertMongoId) {
        skipped++;
        skipReasons.set('no_expert', (skipReasons.get('no_expert') || 0) + 1);
        continue;
      }

      const learnerMongoId = userMap.get(pp.learnerId);
      if (!learnerMongoId) {
        skipped++;
        skipReasons.set('no_learner', (skipReasons.get('no_learner') || 0) + 1);
        continue;
      }

      const proposalMongoId = proposalMap.get(pp.applicationId);

      // PendingPayment uses MongoDB ObjectIds
      const payment: Record<string, unknown> = {
        firebaseId,
        contractId: contractData._id.toString(),
        jobId: jobMongoId,
        ...(proposalMongoId && { proposalId: proposalMongoId }),
        hubId: contractData.hubId.toString(),
        expertId: expertMongoId,
        learnerId: learnerMongoId,
        paymentMethodId: pp.paymentMethodId,
        stripeCustomerId: pp.stripeCustomerId,
        amount: pp.amount,
        currency: pp.currency?.toUpperCase() || 'MYR',
        totalHours: pp.totalHours,
        startDateTime: pp.startDateTime,
        endDateTime: pp.endDateTime,
        contractTitle: pp.contractTitle,
        description: pp.description || '',
        timelogEntryIds: pp.workLogIds || [],
        status: mapPendingPaymentStatus(pp.status),
        retryCount: pp.retryCount || 0,
        maxRetries: pp.maxRetries || 5,
        nextRetryAt: parseTimestamp(pp.nextRetryAt) || new Date(),
        lastError: pp.lastError,
        lastAttempt: parseTimestamp(pp.lastAttempt),
        failedAt: parseTimestamp(pp.failedAt),
        processedAt: parseTimestamp(pp.processedAt),
        paymentIntentId: pp.paymentIntentId,
        createdAt: parseTimestamp(pp.createdAt) || new Date(),
        updatedAt: parseTimestamp(pp.createdAt) || new Date(),
      };

      bulkOps.push(payment);
    } catch (error) {
      errors++;
      console.error(`   ❌ Error processing ${firebaseId}:`, error);
    }
  }

  // Log skip reasons
  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, count] of skipReasons) {
      console.log(`     - ${reason}: ${count}`);
    }
  }

  // Bulk insert
  if (!options.dryRun && bulkOps.length > 0) {
    console.log(`\n   📥 Bulk inserting ${bulkOps.length} pending payments...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      try {
        const result = await PendingPayment.insertMany(batch, { ordered: false });
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

async function buildContractMap(): Promise<
  Map<
    string,
    {
      _id: mongoose.Types.ObjectId;
      clientId: mongoose.Types.ObjectId;
      expertId: mongoose.Types.ObjectId;
      hubId: mongoose.Types.ObjectId;
    }
  >
> {
  const contracts = await Contract.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId createdBy expertId hubId')
    .lean();
  const map = new Map();
  for (const contract of contracts) {
    if (contract.firebaseId) {
      map.set(contract.firebaseId, {
        _id: contract._id as mongoose.Types.ObjectId,
        clientId: contract.createdBy, // createdBy is the client
        expertId: contract.asssignedExpertId, // Expert assigned to contract
        hubId: contract.clientHubId, // Hub that posted the job (employer)
      });
    }
  }
  return map;
}

async function buildJobMap(): Promise<Map<string, string>> {
  const jobs = await Job.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const map = new Map<string, string>();
  for (const job of jobs) {
    if (job.firebaseId) {
      map.set(job.firebaseId, (job._id as mongoose.Types.ObjectId).toString());
    }
  }
  return map;
}

async function buildProposalMap(): Promise<Map<string, string>> {
  const proposals = await JobProposal.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const map = new Map<string, string>();
  for (const proposal of proposals) {
    if (proposal.firebaseId) {
      map.set(proposal.firebaseId, (proposal._id as mongoose.Types.ObjectId).toString());
    }
  }
  return map;
}

async function buildMilestoneMap(): Promise<Map<string, string>> {
  const milestones = await Milestone.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const map = new Map<string, string>();
  for (const m of milestones) {
    if (m.firebaseId) {
      map.set(m.firebaseId, (m._id as mongoose.Types.ObjectId).toString());
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

  console.log('🚀 Contract Payments Migration');
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
    console.log('\n🗑️  Clearing existing records...');
    const cpResult = await ContractPayment.deleteMany({ firebaseId: { $exists: true } });
    // Delete ALL pending payments (both migrated and seed data) to avoid duplicates
    const ppResult = await PendingPayment.deleteMany({});
    console.log(`   Deleted ${cpResult.deletedCount} contract payments (migrated only)`);
    console.log(`   Deleted ${ppResult.deletedCount} pending payments (all)`);
  }

  // Load data
  console.log('\n📂 Loading Firebase data...');
  const bookingData = loadBookingTransactionData();
  const pendingData = loadPendingPaymentsData();
  console.log(`   Loaded ${bookingData.size} booking transactions`);
  console.log(`   Loaded ${pendingData.size} pending payments`);

  // Migrate contract payments
  const cpResult = await migrateContractPayments(bookingData, options);
  console.log(
    `\n📊 Contract Payments: ${cpResult.migrated} migrated, ${cpResult.skipped} skipped, ${cpResult.errors} errors`,
  );

  // Migrate pending payments
  const ppResult = await migratePendingPayments(pendingData, options);
  console.log(
    `\n📊 Pending Payments: ${ppResult.migrated} migrated, ${ppResult.skipped} skipped, ${ppResult.errors} errors`,
  );

  // Summary
  console.log('\n✅ Migration complete!');
  console.log(`   Total contract payments: ${cpResult.migrated}`);
  console.log(`   Total pending payments: ${ppResult.migrated}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

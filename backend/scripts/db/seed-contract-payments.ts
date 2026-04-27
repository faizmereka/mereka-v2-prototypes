#!/usr/bin/env tsx

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
import { Milestone } from '../../src/core/models/Milestone';
import { User } from '../../src/core/models/User';

/**
 * Seed script for creating sample contract payment data
 *
 * Usage:
 *   npx tsx scripts/db/seed-contract-payments.ts
 *   npx tsx scripts/db/seed-contract-payments.ts --count=50
 *   npx tsx scripts/db/seed-contract-payments.ts --clear
 */

// Parse CLI arguments
function parseArgs(): { count: number; clear: boolean } {
  const args = { count: 30, clear: false };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--count=')) {
      const countValue = arg.split('=')[1];
      args.count = countValue ? parseInt(countValue, 10) || 30 : 30;
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

// Milestone task names for milestone payments
const _MILESTONE_TASK_NAMES = [
  'Phase 1 - Requirements & Design',
  'Phase 2 - Frontend Development',
  'Phase 3 - Backend Development',
  'Phase 4 - Testing & QA',
  'Phase 5 - Deployment',
  'Initial Consultation',
  'Strategy Development',
  'Implementation Phase',
  'Review & Optimization',
  'Final Delivery',
  'Research & Analysis',
  'Content Creation',
  'Design Mockups',
  'UI/UX Implementation',
  'API Integration',
];

async function seedContractPayments() {
  const args = parseArgs();

  try {
    console.log('\n💳 Contract Payments Data Seeder\n');
    console.log('='.repeat(50));

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data if flag is set
    if (args.clear) {
      console.log('\n🗑️  Clearing existing contract payments data...');
      const result = await ContractPayment.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} contract payments`);
    }

    // Fetch required data
    console.log('\n📊 Fetching required data...');

    const [hubs, users, contracts, jobs, milestones] = await Promise.all([
      Hub.find({ status: 'active' }).select('_id name').limit(10).lean(),
      User.find({ status: 'active' }).select('_id name email').limit(50).lean(),
      Contract.find({ status: { $in: ['active', 'completed'] } })
        .select('_id contractTitle expertId clientId hubId jobId priceType')
        .limit(20)
        .lean(),
      Job.find({ status: { $in: ['ACTIVE', 'IN_PROGRESS', 'COMPLETED'] } })
        .select('_id jobTitle hubId')
        .limit(30)
        .lean(),
      Milestone.find({ status: { $in: ['funded', 'released', 'completed'] } })
        .select('_id taskName contractId amount currency')
        .limit(30)
        .lean(),
    ]);

    console.log(`   Found ${hubs.length} hubs`);
    console.log(`   Found ${users.length} users`);
    console.log(`   Found ${contracts.length} contracts`);
    console.log(`   Found ${jobs.length} jobs`);
    console.log(`   Found ${milestones.length} milestones`);

    if (hubs.length === 0 || users.length === 0) {
      console.log('\n⚠️  No active hubs or users found. Please seed hubs and users first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // ==================== CONTRACT PAYMENTS ====================
    console.log(`\n📝 Creating ${args.count} sample contract payments...`);

    const contractPayments: mongoose.AnyObject[] = [];

    const paymentTypeDistribution = [
      { status: ContractPaymentType.MILESTONE, weight: 60 },
      { status: ContractPaymentType.TIMELOG, weight: 40 },
    ];

    const paymentStatusDistribution = [
      { status: ContractPaymentStatus.RELEASED, weight: 40 },
      { status: ContractPaymentStatus.FUNDED, weight: 25 },
      { status: ContractPaymentStatus.PENDING, weight: 15 },
      { status: ContractPaymentStatus.PROCESSING, weight: 8 },
      { status: ContractPaymentStatus.REFUNDED, weight: 5 },
      { status: ContractPaymentStatus.FAILED, weight: 5 },
      { status: ContractPaymentStatus.CANCELLED, weight: 2 },
    ];

    for (let i = 0; i < args.count; i++) {
      const paymentType = pickWeightedStatus(paymentTypeDistribution) as ContractPaymentType;
      const status = pickWeightedStatus(paymentStatusDistribution) as ContractPaymentStatus;
      const createdAt = randomDate(sixMonthsAgo, now);

      // Try to use existing data or generate new IDs
      const hub = randomItem(hubs);
      const contract = contracts.length > 0 ? randomItem(contracts) : null;
      const job = jobs.length > 0 ? randomItem(jobs) : null;

      // Get client and expert (different users)
      const expertUser = users.length > 0 ? randomItem(users) : null;
      const clientUser =
        users.length > 1
          ? randomItem(users.filter((u) => u._id.toString() !== expertUser?._id.toString()))
          : expertUser;

      // Generate amounts
      const baseAmounts = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 8000, 10000];
      const amount = randomItem(baseAmounts);
      const platformFeeRate = 0.15;
      const platformFee = Number((amount * platformFeeRate).toFixed(2));
      const stripeFeeRate = 0.029;
      const stripeFee = Number((amount * stripeFeeRate + 1.0).toFixed(2));
      const transferAmount = Number((amount - platformFee - stripeFee).toFixed(2));

      // Determine escrow status based on payment status
      let escrowStatus = EscrowStatus.NONE;
      if (status === ContractPaymentStatus.FUNDED) {
        escrowStatus = EscrowStatus.REQUIRES_CAPTURE;
      } else if (status === ContractPaymentStatus.RELEASED) {
        escrowStatus = EscrowStatus.CAPTURED;
      } else if (status === ContractPaymentStatus.PROCESSING) {
        escrowStatus = EscrowStatus.PROCESSING;
      } else if (status === ContractPaymentStatus.FAILED) {
        escrowStatus = EscrowStatus.FAILED;
      }

      // Generate dates based on status
      let fundedDate: Date | undefined;
      let releasedDate: Date | undefined;
      let refundedDate: Date | undefined;

      if (status === ContractPaymentStatus.FUNDED || status === ContractPaymentStatus.RELEASED) {
        fundedDate = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000); // +1 day
      }
      if (status === ContractPaymentStatus.RELEASED) {
        releasedDate = fundedDate
          ? new Date(fundedDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
          : undefined; // +7 days
      }
      if (status === ContractPaymentStatus.REFUNDED) {
        fundedDate = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        refundedDate = fundedDate
          ? new Date(fundedDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
          : undefined;
      }

      // Build the contract payment object
      const contractPayment: mongoose.AnyObject = {
        paymentType,
        contractId: contract
          ? new mongoose.Types.ObjectId(contract._id.toString())
          : new mongoose.Types.ObjectId(),
        jobId: job
          ? new mongoose.Types.ObjectId(job._id.toString())
          : contract?.jobId
            ? new mongoose.Types.ObjectId((contract.jobId as mongoose.Types.ObjectId).toString())
            : new mongoose.Types.ObjectId(),
        hubId: new mongoose.Types.ObjectId(hub._id.toString()),
        clientId: clientUser
          ? new mongoose.Types.ObjectId(clientUser._id.toString())
          : new mongoose.Types.ObjectId(),
        expertId: expertUser
          ? new mongoose.Types.ObjectId(expertUser._id.toString())
          : new mongoose.Types.ObjectId(),
        amount,
        currency: 'MYR',
        platformFee,
        platformFeeRate,
        stripeFee,
        transferAmount,
        status,
        escrowStatus,
        stripePaymentIntentId:
          status !== ContractPaymentStatus.PENDING ? `pi_seed_cp_${i}_${Date.now()}` : undefined,
        stripeChargeId:
          status === ContractPaymentStatus.RELEASED || status === ContractPaymentStatus.FUNDED
            ? `ch_seed_cp_${i}_${Date.now()}`
            : undefined,
        fundedDate,
        releasedDate,
        refundedDate,
        transferStatus:
          status === ContractPaymentStatus.RELEASED
            ? 'paid'
            : status === ContractPaymentStatus.FUNDED
              ? 'pending'
              : undefined,
        transferredAt: status === ContractPaymentStatus.RELEASED ? releasedDate : undefined,
        createdAt,
        updatedAt: releasedDate || fundedDate || createdAt,
      };

      // Add type-specific fields
      if (paymentType === ContractPaymentType.MILESTONE) {
        // Milestone payment
        const milestone = milestones.length > 0 ? randomItem(milestones) : null;
        contractPayment.milestoneId = milestone
          ? new mongoose.Types.ObjectId(milestone._id.toString())
          : new mongoose.Types.ObjectId();
      } else {
        // Timelog payment
        const weekNumber = Math.floor(Math.random() * 52) + 1;
        const year = 2024;
        const hoursWorked = randomItem([8, 10, 12, 16, 20, 25, 30, 35, 40]);
        const hourlyRate = amount / hoursWorked;

        contractPayment.weekNumber = weekNumber;
        contractPayment.year = year;
        contractPayment.monthNumber = Math.ceil(weekNumber / 4);
        contractPayment.hoursWorked = hoursWorked;
        contractPayment.hourlyRate = Number(hourlyRate.toFixed(2));

        // Calculate week dates
        const weekStartDate = new Date(year, 0, 1 + (weekNumber - 1) * 7);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        contractPayment.weekStartDate = weekStartDate;
        contractPayment.weekEndDate = weekEndDate;
      }

      // Add error info for failed payments
      if (status === ContractPaymentStatus.FAILED) {
        contractPayment.errorCode = randomItem([
          'card_declined',
          'insufficient_funds',
          'expired_card',
          'processing_error',
        ]);
        contractPayment.errorMessage = randomItem([
          'Card was declined',
          'Insufficient funds in account',
          'Card has expired',
          'Payment processing error',
        ]);
        contractPayment.retryCount = Math.floor(Math.random() * 3);
        contractPayment.lastRetryAt = new Date(
          createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000,
        );
      }

      // Add refund info for refunded payments
      if (status === ContractPaymentStatus.REFUNDED) {
        contractPayment.refundReason = randomItem([
          'Service not delivered',
          'Customer request',
          'Quality issues',
          'Contract cancelled',
        ]);
        contractPayment.refundedBy = clientUser
          ? new mongoose.Types.ObjectId(clientUser._id.toString())
          : new mongoose.Types.ObjectId();
      }

      contractPayments.push(contractPayment);
    }

    const cpResult = await ContractPayment.insertMany(contractPayments);
    console.log(`✅ Created ${cpResult.length} contract payments`);

    // ==================== SUMMARY ====================
    const summary = {
      byType: {
        milestone: contractPayments.filter((p) => p.paymentType === ContractPaymentType.MILESTONE)
          .length,
        timelog: contractPayments.filter((p) => p.paymentType === ContractPaymentType.TIMELOG)
          .length,
      },
      byStatus: {
        pending: contractPayments.filter((p) => p.status === ContractPaymentStatus.PENDING).length,
        funded: contractPayments.filter((p) => p.status === ContractPaymentStatus.FUNDED).length,
        processing: contractPayments.filter((p) => p.status === ContractPaymentStatus.PROCESSING)
          .length,
        released: contractPayments.filter((p) => p.status === ContractPaymentStatus.RELEASED)
          .length,
        refunded: contractPayments.filter((p) => p.status === ContractPaymentStatus.REFUNDED)
          .length,
        failed: contractPayments.filter((p) => p.status === ContractPaymentStatus.FAILED).length,
        cancelled: contractPayments.filter((p) => p.status === ContractPaymentStatus.CANCELLED)
          .length,
      },
      totalAmount: contractPayments.reduce((sum, p) => sum + (p.amount as number), 0),
      totalPlatformFees: contractPayments
        .filter((p) => p.status === ContractPaymentStatus.RELEASED)
        .reduce((sum, p) => sum + (p.platformFee as number), 0),
      totalTransferred: contractPayments
        .filter((p) => p.status === ContractPaymentStatus.RELEASED)
        .reduce((sum, p) => sum + (p.transferAmount as number), 0),
    };

    console.log('\n📊 Summary:');
    console.log('='.repeat(50));

    console.log('\n💳 Contract Payments by Type:');
    console.log(`   Milestone: ${summary.byType.milestone}`);
    console.log(`   Timelog:   ${summary.byType.timelog}`);

    console.log('\n📊 Contract Payments by Status:');
    console.log(`   Pending:    ${summary.byStatus.pending}`);
    console.log(`   Funded:     ${summary.byStatus.funded}`);
    console.log(`   Processing: ${summary.byStatus.processing}`);
    console.log(`   Released:   ${summary.byStatus.released}`);
    console.log(`   Refunded:   ${summary.byStatus.refunded}`);
    console.log(`   Failed:     ${summary.byStatus.failed}`);
    console.log(`   Cancelled:  ${summary.byStatus.cancelled}`);

    console.log('\n💰 Financial Summary:');
    console.log(`   Total Amount:       MYR ${summary.totalAmount.toLocaleString()}`);
    console.log(`   Platform Fees:      MYR ${summary.totalPlatformFees.toLocaleString()}`);
    console.log(`   Total Transferred:  MYR ${summary.totalTransferred.toLocaleString()}`);

    console.log('\n='.repeat(50));
    console.log('\n✅ Contract payments seeding completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding contract payments:', error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run seeder
seedContractPayments();

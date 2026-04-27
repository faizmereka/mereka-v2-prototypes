#!/usr/bin/env tsx

/**
 * Migration Script: Firebase contracts -> MongoDB Contract + Milestone + TimelogEntry
 *
 * This script migrates contracts, milestones, and timelogs from Firebase JSON dumps to MongoDB.
 * It reads from data/migrations/contracts_data.json, milestones_data.json, workLogs_data.json
 *
 * ID MAPPING STRATEGY (MongoDB ObjectIds for ALL references):
 * - contracts.firebaseId = original Firebase document ID (for migration tracking only)
 * - contracts.jobId -> MongoDB Job._id (via Job.firebaseId)
 * - contracts.jobProposalId -> MongoDB JobProposal._id (via JobProposal.firebaseId)
 * - contracts.hubId -> MongoDB Hub._id (via Hub.firebaseId)
 * - contracts.expertId/asssignedExpertId -> MongoDB User._id (via User.firebaseId)
 * - contracts.createdBy -> MongoDB User._id (via User.firebaseId)
 *
 * - milestones.firebaseId = original Firebase document ID
 * - milestones.jobId -> MongoDB Job._id
 * - milestones.jobProposalId -> MongoDB JobProposal._id
 * - milestones.contractId -> MongoDB Contract._id (via Contract.firebaseId)
 * - milestones.hubId -> MongoDB Hub._id
 * - milestones.createdBy -> MongoDB User._id
 *
 * - timelogs.firebaseId = original Firebase document ID
 * - timelogs.contractId -> MongoDB Contract._id
 * - timelogs.jobId -> MongoDB Job._id
 * - timelogs.expertId -> MongoDB User._id
 * - timelogs.clientId -> MongoDB User._id
 * - timelogs.hubId -> MongoDB Hub._id
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-contracts.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-contracts.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-contracts.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-contracts.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Contract } from '../../src/core/models/Contract';
import { Hub } from '../../src/core/models/Hub';
import { Job } from '../../src/core/models/Job';
import { JobProposal } from '../../src/core/models/JobProposal';
import { Milestone } from '../../src/core/models/Milestone';
import { TimelogEntry } from '../../src/core/models/TimelogEntry';
import { User } from '../../src/core/models/User';

// =============================================================================
// TYPES - Based on actual Firebase data structure
// =============================================================================

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseContract {
  contractTitle?: string;
  contractDescription?: string;
  contractUploads?: string[];
  proposedPrice?: number | string;
  hourlyProposedPrice?: number | string;
  weeklyLimit?: number | string;
  startDate?: string;
  priceType?: string;
  hasMilestones?: boolean;
  selectedCurrency?: { label?: string; value?: string } | string;
  stripeCustomerId?: string;
  stripeAccount?: string;
  paymentMethodId?: string;
  jobId?: string;
  jobProposalId?: string;
  hubId?: string;
  expertId?: string;
  asssignedExpertId?: string;
  createdBy?: string;
  createdDate?: FirebaseTimestamp;
  acceptMessage?: string;
  status?: string;
  id?: string;
}

interface FirebaseMilestone {
  taskName?: string;
  taskDescription?: string;
  amount?: number | null;
  dueDate?: FirebaseTimestamp;
  jobId?: string;
  jobProposalId?: string;
  offerId?: string; // Legacy: same as jobProposalId
  hubId?: string;
  expertId?: string;
  createdBy?: string;
  createdDate?: FirebaseTimestamp;
  currency?: { label?: string; value?: string } | string;
  status?: string;
  paymentIntentId?: string;
  lastUpdatedBy?: string;
  workLogDescription?: string;
  workLogFilesUrl?: string[];
  workSubmittedDate?: FirebaseTimestamp;
  isDeleted?: boolean;
  id?: string | null;
}

interface FirebaseWorkLog {
  taskTitle?: string;
  taskDescription?: string | null;
  fromHour?: number;
  fromMin?: number;
  fromClockValue?: string;
  toHour?: number;
  toMin?: number;
  toClockValue?: string;
  weekIndex?: number;
  attachment?: unknown[] | null;
  contractId?: string;
  jobId?: string;
  proposalId?: string;
  createdBy?: string;
  createdDate?: FirebaseTimestamp;
  lastUpdatedBy?: string;
  lastUpdatedDate?: FirebaseTimestamp;
  paymentIntentId?: string;
  status?: string;
  formStatus?: string;
  id?: string | null;
}

interface MigrationOptions {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadContractsData(): Map<string, FirebaseContract> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'contracts_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Contracts data not found: ${jsonPath}`);
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseContract>;
  return new Map(Object.entries(data));
}

function loadMilestonesData(): Map<string, FirebaseMilestone> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'milestones_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('   Milestones data not found, skipping milestones migration');
    return new Map();
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseMilestone>;
  return new Map(Object.entries(data));
}

function loadWorkLogsData(): Map<string, FirebaseWorkLog> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'workLogs_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('   WorkLogs data not found, skipping timelogs migration');
    return new Map();
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseWorkLog>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function parseTimestamp(ts?: FirebaseTimestamp | number | string): Date | undefined {
  if (!ts) return undefined;
  if (typeof ts === 'number') {
    return new Date(ts);
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? undefined : new Date(parsed);
  }
  if (ts._seconds) {
    return new Date(ts._seconds * 1000);
  }
  return undefined;
}

function extractCurrency(currency?: { label?: string; value?: string } | string): string {
  if (!currency) return 'MYR';
  if (typeof currency === 'string') return currency;
  return currency.value || 'MYR';
}

function mapContractStatus(status?: string): string {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'completed' || s === 'closed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'paused') return 'paused';
  return 'pending';
}

function mapMilestoneStatus(status?: string): string {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'funded') return 'funded';
  if (s === 'work_submitted' || s === 'submitted') return 'work_submitted';
  if (s === 'released') return 'released';
  if (s === 'approved') return 'approved';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'pending';
}

function mapTimelogStatus(status?: string): string {
  if (!status) return 'draft';
  const s = status.toLowerCase();
  if (s === 'submitted') return 'submitted';
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'paid') return 'paid';
  return 'draft';
}

function mapPriceType(type?: string): 'fixed' | 'hourly' {
  if (!type) return 'fixed';
  return type.toLowerCase() === 'hourly' ? 'hourly' : 'fixed';
}

function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function formatTime(hour?: number, min?: number, clockValue?: string): string {
  if (hour === undefined || min === undefined) return '09:00';

  let h = hour;
  // Handle 12-hour format
  if (clockValue?.toLowerCase() === 'pm' && h < 12) {
    h += 12;
  } else if (clockValue?.toLowerCase() === 'am' && h === 12) {
    h = 0;
  }

  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function calculateHours(
  fromHour?: number,
  fromMin?: number,
  fromClock?: string,
  toHour?: number,
  toMin?: number,
  toClock?: string,
): number {
  if (fromHour === undefined || toHour === undefined) return 0;

  let fh = fromHour;
  let th = toHour;

  // Handle 12-hour format
  if (fromClock?.toLowerCase() === 'pm' && fh < 12) fh += 12;
  else if (fromClock?.toLowerCase() === 'am' && fh === 12) fh = 0;

  if (toClock?.toLowerCase() === 'pm' && th < 12) th += 12;
  else if (toClock?.toLowerCase() === 'am' && th === 12) th = 0;

  const startMinutes = fh * 60 + (fromMin || 0);
  let endMinutes = th * 60 + (toMin || 0);

  // Handle overnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
}

// =============================================================================
// ID MAPPING BUILDERS
// =============================================================================

interface IdMappings {
  hubMap: Map<string, mongoose.Types.ObjectId>;
  userMap: Map<string, mongoose.Types.ObjectId>;
  jobMap: Map<string, mongoose.Types.ObjectId>;
  proposalMap: Map<string, mongoose.Types.ObjectId>;
  contractMap: Map<string, mongoose.Types.ObjectId>;
  // Map from MongoDB proposalId -> MongoDB contractId (built after contracts are migrated)
  proposalToContractMap: Map<string, mongoose.Types.ObjectId>;
}

async function buildIdMappings(): Promise<IdMappings> {
  // Hub mappings: Firebase hubId -> MongoDB _id
  const migratedHubs = await Hub.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const hubMap = new Map<string, mongoose.Types.ObjectId>();
  for (const hub of migratedHubs) {
    if (hub.firebaseId) {
      hubMap.set(hub.firebaseId, hub._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   - ${hubMap.size} hubs mapped`);

  // User mappings: Firebase userId -> MongoDB _id
  const migratedUsers = await User.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const userMap = new Map<string, mongoose.Types.ObjectId>();
  for (const user of migratedUsers) {
    if (user.firebaseId) {
      userMap.set(user.firebaseId, user._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   - ${userMap.size} users mapped`);

  // Job mappings: Firebase jobId -> MongoDB _id
  const migratedJobs = await Job.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const jobMap = new Map<string, mongoose.Types.ObjectId>();
  for (const job of migratedJobs) {
    if (job.firebaseId) {
      jobMap.set(job.firebaseId, job._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   - ${jobMap.size} jobs mapped`);

  // Proposal mappings: Firebase proposalId -> MongoDB _id
  const migratedProposals = await JobProposal.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const proposalMap = new Map<string, mongoose.Types.ObjectId>();
  for (const proposal of migratedProposals) {
    if (proposal.firebaseId) {
      proposalMap.set(proposal.firebaseId, proposal._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   - ${proposalMap.size} proposals mapped`);

  // Contract mappings will be built during migration
  const contractMap = new Map<string, mongoose.Types.ObjectId>();

  // proposalToContract mapping will be built after contracts are migrated
  const proposalToContractMap = new Map<string, mongoose.Types.ObjectId>();

  return { hubMap, userMap, jobMap, proposalMap, contractMap, proposalToContractMap };
}

// =============================================================================
// MIGRATION - CONTRACTS
// =============================================================================

async function migrateContracts(
  contractsData: Map<string, FirebaseContract>,
  mappings: IdMappings,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log(`\n   Processing ${contractsData.size} contract records...`);

  const contractsToMigrate: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const skipReasons = new Map<string, number>();

  for (const [firebaseContractId, fbContract] of contractsData) {
    if (count >= options.limit) break;

    // Skip if no required fields
    if (!fbContract.jobId) {
      skipped++;
      skipReasons.set('no_jobId', (skipReasons.get('no_jobId') || 0) + 1);
      count++;
      continue;
    }

    if (!fbContract.jobProposalId) {
      skipped++;
      skipReasons.set('no_jobProposalId', (skipReasons.get('no_jobProposalId') || 0) + 1);
      count++;
      continue;
    }

    if (!fbContract.hubId) {
      skipped++;
      skipReasons.set('no_hubId', (skipReasons.get('no_hubId') || 0) + 1);
      count++;
      continue;
    }

    // Map all IDs to MongoDB ObjectIds
    const mongoJobId = mappings.jobMap.get(fbContract.jobId);
    if (!mongoJobId) {
      skipped++;
      skipReasons.set('job_not_found', (skipReasons.get('job_not_found') || 0) + 1);
      count++;
      continue;
    }

    let mongoProposalId = mappings.proposalMap.get(fbContract.jobProposalId);

    // If direct proposal not found, try to find alternate proposal by jobId + expertId
    if (!mongoProposalId) {
      const expertFirebaseId = fbContract.expertId || fbContract.asssignedExpertId;
      if (expertFirebaseId && mongoJobId) {
        const mongoExpertId = mappings.userMap.get(expertFirebaseId);
        if (mongoExpertId) {
          // Find proposal by jobId + expertId
          const altProposal = await JobProposal.findOne({
            jobId: mongoJobId,
            asssignedExpertId: mongoExpertId,
          })
            .select('_id')
            .lean();
          if (altProposal) {
            mongoProposalId = altProposal._id as mongoose.Types.ObjectId;
            console.log(
              `      Found alternate proposal for contract ${firebaseContractId}: ${mongoProposalId}`,
            );
          }
        }
      }
    }

    if (!mongoProposalId) {
      skipped++;
      skipReasons.set('proposal_not_found', (skipReasons.get('proposal_not_found') || 0) + 1);
      count++;
      continue;
    }

    const mongoHubId = mappings.hubMap.get(fbContract.hubId);
    if (!mongoHubId) {
      skipped++;
      skipReasons.set('hub_not_found', (skipReasons.get('hub_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Expert ID
    const expertFirebaseId = fbContract.expertId || fbContract.asssignedExpertId;
    if (!expertFirebaseId) {
      skipped++;
      skipReasons.set('no_expertId', (skipReasons.get('no_expertId') || 0) + 1);
      count++;
      continue;
    }

    const mongoExpertId = mappings.userMap.get(expertFirebaseId);
    if (!mongoExpertId) {
      skipped++;
      skipReasons.set('expert_not_found', (skipReasons.get('expert_not_found') || 0) + 1);
      count++;
      continue;
    }

    // CreatedBy
    const createdByFirebaseId = fbContract.createdBy || expertFirebaseId;
    const mongoCreatedBy = mappings.userMap.get(createdByFirebaseId) || mongoExpertId;

    // Map status
    const status = mapContractStatus(fbContract.status);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Parse start date
    let startDate: Date;
    if (fbContract.startDate) {
      const parsed = Date.parse(fbContract.startDate);
      startDate = Number.isNaN(parsed) ? new Date() : new Date(parsed);
    } else {
      startDate = parseTimestamp(fbContract.createdDate) || new Date();
    }

    // Build contract document with ALL MongoDB ObjectIds
    const contract: Record<string, unknown> = {
      firebaseId: firebaseContractId,

      // References - ALL MongoDB ObjectIds
      jobId: mongoJobId,
      jobProposalId: mongoProposalId,
      hubId: mongoHubId,
      asssignedExpertId: mongoExpertId,
      expertId: mongoExpertId,
      createdBy: mongoCreatedBy,

      // Contract details
      contractTitle: truncateText(fbContract.contractTitle, 70) || 'Untitled Contract',
      contractDescription: truncateText(fbContract.contractDescription, 5000) || 'No description',
      contractUploads: fbContract.contractUploads || [],

      // Pricing
      priceType: mapPriceType(fbContract.priceType),
      proposedPrice: Number(fbContract.proposedPrice) || 0,
      hourlyProposedPrice: fbContract.hourlyProposedPrice
        ? Number(fbContract.hourlyProposedPrice)
        : undefined,
      weeklyLimit: fbContract.weeklyLimit ? Number(fbContract.weeklyLimit) : undefined,
      hasMilestones: fbContract.hasMilestones ?? false,
      selectedCurrency: extractCurrency(fbContract.selectedCurrency),

      // Timeline
      startDate,
      status,

      // Stripe info
      stripeCustomerId: fbContract.stripeCustomerId,
      stripeAccount: fbContract.stripeAccount,
      paymentMethodId: fbContract.paymentMethodId,

      // Timestamps
      createdAt: parseTimestamp(fbContract.createdDate) || new Date(),
      updatedAt: parseTimestamp(fbContract.createdDate) || new Date(),
    };

    contractsToMigrate.push(contract);
    count++;
  }

  console.log(`   Contracts to migrate: ${contractsToMigrate.length}`);
  console.log(`   Skipped: ${skipped}`);

  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, cnt] of skipReasons) {
      console.log(`     - ${reason}: ${cnt}`);
    }
  }

  console.log('\n   Status distribution:');
  for (const [status, cnt] of statusDistribution) {
    console.log(`     - ${status}: ${cnt}`);
  }

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${contractsToMigrate.length} Contract records`);
    if (contractsToMigrate[0]) {
      console.log('\n   Sample Contract:', JSON.stringify(contractsToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   Cleaning up existing Contracts (--force)...');
    const existingCount = await Contract.countDocuments();
    console.log(`      Deleting ${existingCount} existing contracts...`);
    await Contract.deleteMany({});
    console.log('      Done');
  }

  // Insert one by one to capture errors and build contractMap
  console.log(`\n   Inserting ${contractsToMigrate.length} contracts...`);
  let migrated = 0;
  let errors = 0;
  const errorDetails: Array<{ index: number; firebaseId: string; error: string }> = [];

  for (let i = 0; i < contractsToMigrate.length; i++) {
    const contract = contractsToMigrate[i];
    if (!contract) continue;
    try {
      const created = await Contract.create(contract);
      const contractId = created._id as mongoose.Types.ObjectId;
      mappings.contractMap.set(contract.firebaseId as string, contractId);

      // Also build proposalToContract mapping for milestone linking
      const proposalId = contract.jobProposalId as mongoose.Types.ObjectId;
      if (proposalId) {
        mappings.proposalToContractMap.set(proposalId.toString(), contractId);
      }

      migrated++;
    } catch (error: unknown) {
      errors++;
      const firebaseId = (contract.firebaseId as string) || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      errorDetails.push({ index: i, firebaseId, error: errMsg });
    }
  }

  console.log(
    `   Built proposalToContract mapping: ${mappings.proposalToContractMap.size} entries`,
  );

  console.log(`   Contracts inserted: ${migrated}`);
  if (errors > 0) {
    console.log(`   Failed: ${errors}`);
    console.log('\n   First 5 errors:');
    for (const err of errorDetails.slice(0, 5)) {
      console.log(`      [${err.index}] ${err.firebaseId}: ${err.error.slice(0, 100)}`);
    }
  }

  return { migrated, skipped, errors };
}

// =============================================================================
// MIGRATION - MILESTONES
// =============================================================================

async function migrateMilestones(
  milestonesData: Map<string, FirebaseMilestone>,
  mappings: IdMappings,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  if (milestonesData.size === 0) {
    console.log('\n   No milestones to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  console.log(`\n   Processing ${milestonesData.size} milestone records...`);

  const milestonesToMigrate: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const skipReasons = new Map<string, number>();

  for (const [firebaseMilestoneId, fbMilestone] of milestonesData) {
    if (count >= options.limit) break;

    // Skip deleted milestones
    if (fbMilestone.isDeleted) {
      skipped++;
      skipReasons.set('deleted', (skipReasons.get('deleted') || 0) + 1);
      count++;
      continue;
    }

    // Skip if no required fields
    if (!fbMilestone.jobId) {
      skipped++;
      skipReasons.set('no_jobId', (skipReasons.get('no_jobId') || 0) + 1);
      count++;
      continue;
    }

    const proposalId = fbMilestone.jobProposalId || fbMilestone.offerId;
    if (!proposalId) {
      skipped++;
      skipReasons.set('no_proposalId', (skipReasons.get('no_proposalId') || 0) + 1);
      count++;
      continue;
    }

    if (!fbMilestone.hubId) {
      skipped++;
      skipReasons.set('no_hubId', (skipReasons.get('no_hubId') || 0) + 1);
      count++;
      continue;
    }

    // Map all IDs to MongoDB ObjectIds
    const mongoJobId = mappings.jobMap.get(fbMilestone.jobId);
    if (!mongoJobId) {
      skipped++;
      skipReasons.set('job_not_found', (skipReasons.get('job_not_found') || 0) + 1);
      count++;
      continue;
    }

    const mongoProposalId = mappings.proposalMap.get(proposalId);
    if (!mongoProposalId) {
      skipped++;
      skipReasons.set('proposal_not_found', (skipReasons.get('proposal_not_found') || 0) + 1);
      count++;
      continue;
    }

    const mongoHubId = mappings.hubMap.get(fbMilestone.hubId);
    if (!mongoHubId) {
      skipped++;
      skipReasons.set('hub_not_found', (skipReasons.get('hub_not_found') || 0) + 1);
      count++;
      continue;
    }

    // CreatedBy
    const mongoCreatedBy = fbMilestone.createdBy
      ? mappings.userMap.get(fbMilestone.createdBy)
      : undefined;
    if (!mongoCreatedBy) {
      skipped++;
      skipReasons.set('user_not_found', (skipReasons.get('user_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map status
    const status = mapMilestoneStatus(fbMilestone.status);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Look up contractId from proposalId
    const mongoContractId = mappings.proposalToContractMap.get(mongoProposalId.toString());

    // Build milestone document with ALL MongoDB ObjectIds
    const milestone: Record<string, unknown> = {
      firebaseId: firebaseMilestoneId,

      // References - ALL MongoDB ObjectIds
      jobId: mongoJobId,
      jobProposalId: mongoProposalId,
      contractId: mongoContractId, // Link to contract via proposal
      hubId: mongoHubId,
      createdBy: mongoCreatedBy,

      // Milestone details
      taskName: truncateText(fbMilestone.taskName, 150) || 'Untitled Milestone',
      taskDescription: truncateText(fbMilestone.taskDescription, 200) || '',
      amount: Number(fbMilestone.amount) || 0,
      dueDate: parseTimestamp(fbMilestone.dueDate) || new Date(),
      currency: extractCurrency(fbMilestone.currency),
      status,

      // Work submission
      workLogDescription: fbMilestone.workLogDescription,
      workLogFilesUrl: fbMilestone.workLogFilesUrl || [],
      workSubmittedDate: parseTimestamp(fbMilestone.workSubmittedDate),

      // Payment tracking
      paymentIntentId: fbMilestone.paymentIntentId,

      // Change tracking
      lastModifiedBy: fbMilestone.lastUpdatedBy
        ? mappings.userMap.get(fbMilestone.lastUpdatedBy)
        : undefined,

      // Timestamps
      createdDate: parseTimestamp(fbMilestone.createdDate) || new Date(),
      updatedDate: parseTimestamp(fbMilestone.createdDate) || new Date(),
    };

    milestonesToMigrate.push(milestone);
    count++;
  }

  console.log(`   Milestones to migrate: ${milestonesToMigrate.length}`);
  console.log(`   Skipped: ${skipped}`);

  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, cnt] of skipReasons) {
      console.log(`     - ${reason}: ${cnt}`);
    }
  }

  console.log('\n   Status distribution:');
  for (const [status, cnt] of statusDistribution) {
    console.log(`     - ${status}: ${cnt}`);
  }

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${milestonesToMigrate.length} Milestone records`);
    if (milestonesToMigrate[0]) {
      console.log('\n   Sample Milestone:', JSON.stringify(milestonesToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   Cleaning up existing Milestones (--force)...');
    const existingCount = await Milestone.countDocuments();
    console.log(`      Deleting ${existingCount} existing milestones...`);
    await Milestone.deleteMany({});
    console.log('      Done');
  }

  // Insert one by one to capture errors
  console.log(`\n   Inserting ${milestonesToMigrate.length} milestones...`);
  let migrated = 0;
  let errors = 0;
  const errorDetails: Array<{ index: number; firebaseId: string; error: string }> = [];

  for (let i = 0; i < milestonesToMigrate.length; i++) {
    const milestone = milestonesToMigrate[i];
    if (!milestone) continue;
    try {
      await Milestone.create(milestone);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const firebaseId = (milestone.firebaseId as string) || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      errorDetails.push({ index: i, firebaseId, error: errMsg });
    }
  }

  console.log(`   Milestones inserted: ${migrated}`);
  if (errors > 0) {
    console.log(`   Failed: ${errors}`);
    console.log('\n   First 5 errors:');
    for (const err of errorDetails.slice(0, 5)) {
      console.log(`      [${err.index}] ${err.firebaseId}: ${err.error.slice(0, 100)}`);
    }
  }

  return { migrated, skipped, errors };
}

// =============================================================================
// MIGRATION - TIMELOGS (WORKLOGS)
// =============================================================================

async function migrateTimelogs(
  workLogsData: Map<string, FirebaseWorkLog>,
  mappings: IdMappings,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  if (workLogsData.size === 0) {
    console.log('\n   No timelogs to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  console.log(`\n   Processing ${workLogsData.size} timelog records...`);

  // Build a map of contracts to get hubId and clientId
  const contractDetails = await Contract.find({})
    .select('_id firebaseId hubId createdBy hourlyProposedPrice weeklyLimit selectedCurrency')
    .lean();
  const contractInfoMap = new Map<
    string,
    {
      _id: mongoose.Types.ObjectId;
      hubId: mongoose.Types.ObjectId;
      clientId: mongoose.Types.ObjectId;
      hourlyRate: number;
      weeklyLimit: number;
      currency: string;
    }
  >();
  for (const contract of contractDetails) {
    if (contract.firebaseId) {
      contractInfoMap.set(contract.firebaseId, {
        _id: contract._id as mongoose.Types.ObjectId,
        hubId: contract.clientHubId, // Hub that posted the job (employer)
        clientId: contract.createdBy,
        hourlyRate: contract.hourlyProposedPrice || 0,
        weeklyLimit: contract.weeklyLimit || 40,
        currency: contract.selectedCurrency,
      });
    }
  }

  const timelogsToMigrate: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const skipReasons = new Map<string, number>();

  for (const [firebaseTimelogId, fbWorkLog] of workLogsData) {
    if (count >= options.limit) break;

    // Skip if no required fields
    if (!fbWorkLog.contractId) {
      skipped++;
      skipReasons.set('no_contractId', (skipReasons.get('no_contractId') || 0) + 1);
      count++;
      continue;
    }

    if (!fbWorkLog.jobId) {
      skipped++;
      skipReasons.set('no_jobId', (skipReasons.get('no_jobId') || 0) + 1);
      count++;
      continue;
    }

    if (!fbWorkLog.createdBy) {
      skipped++;
      skipReasons.set('no_createdBy', (skipReasons.get('no_createdBy') || 0) + 1);
      count++;
      continue;
    }

    // Get contract info (includes hubId, clientId)
    const contractInfo = contractInfoMap.get(fbWorkLog.contractId);
    if (!contractInfo) {
      skipped++;
      skipReasons.set('contract_not_found', (skipReasons.get('contract_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map job ID
    const mongoJobId = mappings.jobMap.get(fbWorkLog.jobId);
    if (!mongoJobId) {
      skipped++;
      skipReasons.set('job_not_found', (skipReasons.get('job_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map expert ID (createdBy for worklogs)
    const mongoExpertId = mappings.userMap.get(fbWorkLog.createdBy);
    if (!mongoExpertId) {
      skipped++;
      skipReasons.set('expert_not_found', (skipReasons.get('expert_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map status
    const status = mapTimelogStatus(fbWorkLog.status || fbWorkLog.formStatus);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Calculate time
    const startTime = formatTime(fbWorkLog.fromHour, fbWorkLog.fromMin, fbWorkLog.fromClockValue);
    const endTime = formatTime(fbWorkLog.toHour, fbWorkLog.toMin, fbWorkLog.toClockValue);
    const hoursWorked = calculateHours(
      fbWorkLog.fromHour,
      fbWorkLog.fromMin,
      fbWorkLog.fromClockValue,
      fbWorkLog.toHour,
      fbWorkLog.toMin,
      fbWorkLog.toClockValue,
    );

    // Work date from createdDate
    const workDate = parseTimestamp(fbWorkLog.createdDate) || new Date();

    // Build timelog document with ALL MongoDB ObjectIds
    const timelog: Record<string, unknown> = {
      firebaseId: firebaseTimelogId,

      // References - ALL MongoDB ObjectIds
      contractId: contractInfo._id,
      jobId: mongoJobId,
      expertId: mongoExpertId,
      clientId: contractInfo.clientId,
      hubId: contractInfo.hubId,
      createdBy: mongoExpertId,

      // Date tracking
      workDate,
      weekNumber: fbWorkLog.weekIndex || 0,
      year: workDate.getFullYear(),
      monthNumber: workDate.getMonth() + 1,

      // Time tracking
      startTime,
      endTime,
      hoursWorked,

      // Work details
      description: truncateText(fbWorkLog.taskTitle || fbWorkLog.taskDescription, 1000) || 'Work',
      tasks: [],

      // Contract terms at time of work
      hourlyRate: contractInfo.hourlyRate,
      weeklyLimit: contractInfo.weeklyLimit,
      currency: contractInfo.currency,

      // Payment calculation
      billableAmount: Number((hoursWorked * contractInfo.hourlyRate).toFixed(2)),

      // Status
      status,
      paymentStatus: status === 'paid' ? 'paid' : 'pending',

      // Payment tracking
      paymentIntentId: fbWorkLog.paymentIntentId,

      // Timestamps
      createdDate: parseTimestamp(fbWorkLog.createdDate) || new Date(),
      updatedDate: parseTimestamp(fbWorkLog.lastUpdatedDate) || new Date(),
    };

    timelogsToMigrate.push(timelog);
    count++;
  }

  console.log(`   Timelogs to migrate: ${timelogsToMigrate.length}`);
  console.log(`   Skipped: ${skipped}`);

  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, cnt] of skipReasons) {
      console.log(`     - ${reason}: ${cnt}`);
    }
  }

  console.log('\n   Status distribution:');
  for (const [status, cnt] of statusDistribution) {
    console.log(`     - ${status}: ${cnt}`);
  }

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${timelogsToMigrate.length} TimelogEntry records`);
    if (timelogsToMigrate[0]) {
      console.log('\n   Sample Timelog:', JSON.stringify(timelogsToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   Cleaning up existing TimelogEntries (--force)...');
    const existingCount = await TimelogEntry.countDocuments();
    console.log(`      Deleting ${existingCount} existing timelogs...`);
    await TimelogEntry.deleteMany({});
    console.log('      Done');
  }

  // Insert one by one to capture errors
  console.log(`\n   Inserting ${timelogsToMigrate.length} timelogs...`);
  let migrated = 0;
  let errors = 0;
  const errorDetails: Array<{ index: number; firebaseId: string; error: string }> = [];

  for (let i = 0; i < timelogsToMigrate.length; i++) {
    const timelog = timelogsToMigrate[i];
    if (!timelog) continue;
    try {
      await TimelogEntry.create(timelog);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const firebaseId = (timelog.firebaseId as string) || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      errorDetails.push({ index: i, firebaseId, error: errMsg });
    }
  }

  console.log(`   Timelogs inserted: ${migrated}`);
  if (errors > 0) {
    console.log(`   Failed: ${errors}`);
    console.log('\n   First 5 errors:');
    for (const err of errorDetails.slice(0, 5)) {
      console.log(`      [${err.index}] ${err.firebaseId}: ${err.error.slice(0, 100)}`);
    }
  }

  return { migrated, skipped, errors };
}

// =============================================================================
// MAIN MIGRATION
// =============================================================================

async function migrateToMongoDB(
  contractsData: Map<string, FirebaseContract>,
  milestonesData: Map<string, FirebaseMilestone>,
  workLogsData: Map<string, FirebaseWorkLog>,
  options: MigrationOptions,
): Promise<void> {
  console.log('\n Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log(' Connected to MongoDB');

  try {
    // Build ID mappings
    console.log('\n Building ID mappings...');
    const mappings = await buildIdMappings();

    // Migrate contracts first (needed for timelogs)
    console.log(`\n${'='.repeat(60)}`);
    console.log(' CONTRACTS MIGRATION');
    console.log('='.repeat(60));
    const contractsResult = await migrateContracts(contractsData, mappings, options);

    // Migrate milestones
    console.log(`\n${'='.repeat(60)}`);
    console.log(' MILESTONES MIGRATION');
    console.log('='.repeat(60));
    const milestonesResult = await migrateMilestones(milestonesData, mappings, options);

    // Migrate timelogs (needs contract mapping)
    console.log(`\n${'='.repeat(60)}`);
    console.log(' TIMELOGS MIGRATION');
    console.log('='.repeat(60));
    const timelogsResult = await migrateTimelogs(workLogsData, mappings, options);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(' MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log('\n   CONTRACTS:');
    console.log(`     Migrated: ${contractsResult.migrated}`);
    console.log(`     Skipped:  ${contractsResult.skipped}`);
    console.log(`     Errors:   ${contractsResult.errors}`);
    console.log('\n   MILESTONES:');
    console.log(`     Migrated: ${milestonesResult.migrated}`);
    console.log(`     Skipped:  ${milestonesResult.skipped}`);
    console.log(`     Errors:   ${milestonesResult.errors}`);
    console.log('\n   TIMELOGS:');
    console.log(`     Migrated: ${timelogsResult.migrated}`);
    console.log(`     Skipped:  ${timelogsResult.skipped}`);
    console.log(`     Errors:   ${timelogsResult.errors}`);

    if (!options.dryRun) {
      const totalContracts = await Contract.countDocuments();
      const totalMilestones = await Milestone.countDocuments();
      const totalTimelogs = await TimelogEntry.countDocuments();
      console.log('\n Final counts in DB:');
      console.log(`   Total Contracts: ${totalContracts}`);
      console.log(`   Total Milestones: ${totalMilestones}`);
      console.log(`   Total Timelogs: ${totalTimelogs}`);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n MongoDB connection closed');
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    limit: 100000,
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
  };

  // Parse limit
  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (limitArg) {
    options.limit = Number.parseInt(limitArg.split('=')[1] || '100000', 10);
  }

  const isMigrate = args.includes('--migrate');

  console.log(' Contracts, Milestones & Timelogs Migration Tool');
  console.log('='.repeat(60));
  console.log(`   Mode:     ${options.dryRun ? 'Dry Run' : isMigrate ? 'Migrate' : 'Analyze'}`);
  console.log(`   Limit:    ${options.limit}`);
  console.log(`   Force:    ${options.force}`);
  console.log('='.repeat(60));

  try {
    // Load data from JSON files
    console.log('\n Loading data from JSON files...');
    const contractsData = loadContractsData();
    const milestonesData = loadMilestonesData();
    const workLogsData = loadWorkLogsData();
    console.log(`   Loaded ${contractsData.size} contracts`);
    console.log(`   Loaded ${milestonesData.size} milestones`);
    console.log(`   Loaded ${workLogsData.size} worklogs`);

    if (isMigrate || options.dryRun) {
      await migrateToMongoDB(contractsData, milestonesData, workLogsData, options);
    } else {
      // Just analyze
      console.log('\n ANALYSIS:');

      // Contracts analysis
      const contractStatusCount = new Map<string, number>();
      let contractsWithMilestones = 0;
      let hourlyContracts = 0;

      for (const [, contract] of contractsData) {
        const status = (contract.status || 'unknown').toLowerCase();
        contractStatusCount.set(status, (contractStatusCount.get(status) || 0) + 1);
        if (contract.hasMilestones) contractsWithMilestones++;
        if (contract.priceType?.toLowerCase() === 'hourly') hourlyContracts++;
      }

      console.log(`\n   Contracts: ${contractsData.size}`);
      console.log(`     With milestones: ${contractsWithMilestones}`);
      console.log(`     Hourly: ${hourlyContracts}`);
      console.log(`     Fixed: ${contractsData.size - hourlyContracts}`);

      console.log('\n   Contracts by status:');
      for (const [status, count] of contractStatusCount) {
        console.log(`     - ${status}: ${count}`);
      }

      // Milestones analysis
      const milestoneStatusCount = new Map<string, number>();
      let deletedMilestones = 0;

      for (const [, milestone] of milestonesData) {
        if (milestone.isDeleted) {
          deletedMilestones++;
          continue;
        }
        const status = (milestone.status || 'unknown').toLowerCase();
        milestoneStatusCount.set(status, (milestoneStatusCount.get(status) || 0) + 1);
      }

      console.log(`\n   Milestones: ${milestonesData.size}`);
      console.log(`     Deleted: ${deletedMilestones}`);
      console.log('\n   Milestones by status:');
      for (const [status, count] of milestoneStatusCount) {
        console.log(`     - ${status}: ${count}`);
      }

      // Worklogs analysis
      const worklogStatusCount = new Map<string, number>();

      for (const [, worklog] of workLogsData) {
        const status = (worklog.status || worklog.formStatus || 'unknown').toLowerCase();
        worklogStatusCount.set(status, (worklogStatusCount.get(status) || 0) + 1);
      }

      console.log(`\n   WorkLogs: ${workLogsData.size}`);
      console.log('\n   WorkLogs by status:');
      for (const [status, count] of worklogStatusCount) {
        console.log(`     - ${status}: ${count}`);
      }

      console.log('\nUse --migrate to migrate data or --dry-run to preview changes');
    }

    console.log('\n Done!');
  } catch (error) {
    console.error('\n Error:', error);
    process.exit(1);
  }
}

main();

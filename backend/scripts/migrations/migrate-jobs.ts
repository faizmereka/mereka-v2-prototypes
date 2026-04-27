#!/usr/bin/env tsx

/**
 * Migration Script: Firebase jobs -> MongoDB Job + JobProposal
 *
 * This script migrates jobs and job proposals from Firebase JSON dump to MongoDB.
 * It reads from data/migrations/jobs_data.json and jobProposals_data.json
 *
 * Mappings:
 * - jobs.hubId (Firebase UID) -> MongoDB Hub._id (via Hub.firebaseId)
 * - jobs.createdBy (Firebase UID) -> MongoDB User._id (via User.firebaseId)
 * - jobProposals.jobId -> Job._id (via Job.firebaseId)
 * - jobProposals.hubId (Firebase UID) -> MongoDB Hub._id (via Hub.firebaseId)
 * - jobProposals.expertId/asssignedExpertId -> User._id (via User.firebaseId)
 * - jobProposals.createdBy -> User._id (via User.firebaseId)
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-jobs.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-jobs.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-jobs.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-jobs.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Hub } from '../../src/core/models/Hub';
import { Job } from '../../src/core/models/Job';
import { JobProposal } from '../../src/core/models/JobProposal';
import { User } from '../../src/core/models/User';

// =============================================================================
// TYPES - Based on actual Firebase data structure
// =============================================================================

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseServiceCategory {
  category?: {
    label?: string;
    value?: string;
  };
  serviceType?: {
    label?: string;
    value?: string;
  };
}

interface FirebaseJobBudget {
  pricingType?: string;
  fromAmount?: number | string;
  upToAmount?: number | string;
}

interface FirebaseJob {
  jobTitle?: string;
  jobDescription?: string;
  jobSummary?: string;
  employmentType?: string;
  serviceCategory?: FirebaseServiceCategory;
  expertLevel?: { label?: string; value?: string } | string;
  jobLocation?: string;
  preferredLocation?: Array<{ address?: string }>;
  jobSkills?: string[];
  jobStartDate?: string | FirebaseTimestamp;
  jobEndDate?: string;
  jobBudget?: FirebaseJobBudget;
  jobCurrency?: { label?: string; value?: string } | string;
  name?: string;
  email?: string;
  phoneNumber?:
    | {
        countryCode?: string;
        dialCode?: string;
        e164Number?: string;
        internationalNumber?: string;
        nationalNumber?: string;
        number?: string;
      }
    | string;
  organizationName?: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId?: string;
  createdBy?: string;
  createdDate?: FirebaseTimestamp;
  lastUpdatedDate?: FirebaseTimestamp;
  jobUploads?: string[];
  status?: string;
  accessMode?: string;
  proposals?: FirebaseProposal[];
}

interface FirebaseProposal {
  id?: string;
  jobId?: string;
  proposalDetails?: string;
  priceType?: string;
  proposedPrice?: number;
  hourlyProposedPrice?: number;
  workingHours?: number;
  selectedCurrency?: string;
  files?: string[];
  expertId?: string;
  asssignedExpertId?: string;
  createdBy?: string;
  hubId?: string;
  status?: string;
  createdDate?: FirebaseTimestamp;
}

interface MigrationOptions {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadJobsData(): Map<string, FirebaseJob> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'jobs_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Jobs data not found: ${jsonPath}`);
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseJob>;
  return new Map(Object.entries(data));
}

function loadProposalsData(): Map<string, FirebaseProposal> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'jobProposals_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('   Job proposals data not found, skipping proposals migration');
    return new Map();
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseProposal>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function mapJobStatus(status?: string): string {
  if (!status) return 'DRAFT';
  const s = status.toLowerCase();
  if (s === 'active') return 'ACTIVE';
  if (s === 'drafted' || s === 'draft') return 'DRAFT';
  if (s === 'closed' || s === 'archived') return 'COMPLETED';
  if (s === 'deleted' || s === 'cancelled') return 'CANCELLED';
  if (s === 'in_progress' || s === 'inprogress') return 'IN_PROGRESS';
  if (s === 'expired') return 'EXPIRED';
  return 'DRAFT';
}

function mapEmploymentType(type?: string): string {
  if (!type) return 'freelance';
  const t = type.toLowerCase();
  if (t === 'full-time' || t === 'fulltime') return 'full-time';
  if (t === 'part-time' || t === 'parttime') return 'part-time';
  return 'freelance';
}

function mapPricingType(type?: string): string {
  if (!type) return 'fixed';
  return type.toLowerCase() === 'hourly' ? 'hourly' : 'fixed';
}

function mapAccessMode(mode?: string): string {
  if (!mode) return 'PUBLIC';
  return mode.toUpperCase() === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
}

function mapProposalStatus(status?: string): string {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s === 'accepted' || s === 'hired') return 'accepted';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (s === 'withdrawn' || s === 'cancelled') return 'withdrawn';
  return 'pending';
}

function parseTimestamp(ts?: FirebaseTimestamp | number | string): Date | undefined {
  if (!ts) return undefined;
  if (typeof ts === 'number') {
    return new Date(ts);
  }
  if (typeof ts === 'string') {
    // Handle strings like "asap", "flexible", etc.
    if (['asap', 'flexible', 'immediately'].includes(ts.toLowerCase())) {
      return undefined;
    }
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

function extractExpertLevel(level?: { label?: string; value?: string } | string): string {
  if (!level) return '';
  if (typeof level === 'string') return level;
  return level.value || level.label || '';
}

function extractPhoneNumber(phone?: FirebaseJob['phoneNumber']): string {
  if (!phone) return '';
  if (typeof phone === 'string') return phone;
  return phone.e164Number || phone.internationalNumber || phone.number || '';
}

function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

// =============================================================================
// MIGRATION - JOBS
// =============================================================================

async function migrateJobs(
  jobsData: Map<string, FirebaseJob>,
  options: MigrationOptions,
): Promise<{
  migrated: number;
  skipped: number;
  errors: number;
  jobIdMap: Map<string, mongoose.Types.ObjectId>;
}> {
  console.log(`\n📥 Processing ${jobsData.size} job records...`);

  // Get Hub mappings - Firebase hubId -> MongoDB _id
  const migratedHubs = await Hub.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const hubMap = new Map<string, string>();
  for (const hub of migratedHubs) {
    if (hub.firebaseId) {
      hubMap.set(hub.firebaseId, (hub._id as mongoose.Types.ObjectId).toString());
    }
  }
  console.log(`   - ${hubMap.size} hubs mapped (firebaseId -> MongoDB _id)`);

  // Get User mappings - Firebase userId -> MongoDB _id
  const migratedUsers = await User.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const userMap = new Map<string, string>();
  for (const user of migratedUsers) {
    if (user.firebaseId) {
      userMap.set(user.firebaseId, (user._id as mongoose.Types.ObjectId).toString());
    }
  }
  console.log(`   - ${userMap.size} users mapped (firebaseId -> MongoDB _id)`);

  // Process jobs
  const jobsToMigrate: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const skipReasons = new Map<string, number>();

  for (const [firebaseJobId, fbJob] of jobsData) {
    if (count >= options.limit) break;

    // Skip if no required fields
    if (!fbJob.jobTitle) {
      skipped++;
      skipReasons.set('no_title', (skipReasons.get('no_title') || 0) + 1);
      count++;
      continue;
    }

    if (!fbJob.hubId) {
      skipped++;
      skipReasons.set('no_hubId', (skipReasons.get('no_hubId') || 0) + 1);
      count++;
      continue;
    }

    if (!fbJob.createdBy) {
      skipped++;
      skipReasons.set('no_createdBy', (skipReasons.get('no_createdBy') || 0) + 1);
      count++;
      continue;
    }

    // Map hubId from Firebase to MongoDB
    const mongoHubId = hubMap.get(fbJob.hubId);
    if (!mongoHubId) {
      skipped++;
      skipReasons.set('hub_not_found', (skipReasons.get('hub_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map createdBy from Firebase to MongoDB
    const mongoCreatedBy = userMap.get(fbJob.createdBy);
    if (!mongoCreatedBy) {
      skipped++;
      skipReasons.set('user_not_found', (skipReasons.get('user_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map status
    const status = mapJobStatus(fbJob.status);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Extract service category
    const serviceCategory = {
      category: fbJob.serviceCategory?.category?.value || 'general',
      serviceType: fbJob.serviceCategory?.serviceType?.value || 'other',
    };

    // Extract budget
    const jobBudget = {
      pricingType: mapPricingType(fbJob.jobBudget?.pricingType),
      fromAmount: Number(fbJob.jobBudget?.fromAmount) || 0,
      upToAmount: fbJob.jobBudget?.upToAmount ? Number(fbJob.jobBudget.upToAmount) : undefined,
    };

    // Extract preferred locations
    const preferredLocation = (fbJob.preferredLocation || [])
      .map((loc) => loc.address)
      .filter((addr): addr is string => !!addr);

    // Build job document
    const job: Record<string, unknown> = {
      firebaseId: firebaseJobId,

      // Job details
      jobTitle: fbJob.jobTitle,
      jobDescription: fbJob.jobDescription || fbJob.jobTitle,
      jobSummary: truncateText(fbJob.jobSummary, 500),
      employmentType: mapEmploymentType(fbJob.employmentType),
      status,

      // Service category
      serviceCategory,

      // Experience and location
      expertLevel: extractExpertLevel(fbJob.expertLevel),
      jobLocation: fbJob.jobLocation || '',
      preferredLocation,

      // Budget
      jobBudget,
      jobCurrency: extractCurrency(fbJob.jobCurrency),

      // Timeline
      jobStartDate: parseTimestamp(fbJob.jobStartDate as FirebaseTimestamp),
      jobEndDate: fbJob.jobEndDate || '',

      // Skills and attachments
      jobSkills: fbJob.jobSkills || [],
      jobUploads: fbJob.jobUploads || [],

      // Access mode
      accessMode: mapAccessMode(fbJob.accessMode),

      // Contact information
      name: fbJob.name || 'Unknown',
      email: fbJob.email || 'unknown@mereka.io',
      phoneNumber: extractPhoneNumber(fbJob.phoneNumber),
      organizationName: fbJob.organizationName || '',
      aboutOrganization: fbJob.aboutOrganization || '',
      organizationImage: fbJob.organizationImage || '',

      // References (mapped to MongoDB _id)
      hubId: mongoHubId,
      createdBy: mongoCreatedBy,

      // Timestamps
      createdDate: parseTimestamp(fbJob.createdDate) || new Date(),
      lastUpdatedDate: parseTimestamp(fbJob.lastUpdatedDate),
      createdAt: parseTimestamp(fbJob.createdDate) || new Date(),
      updatedAt: parseTimestamp(fbJob.lastUpdatedDate) || new Date(),
    };

    jobsToMigrate.push(job);
    count++;
  }

  console.log(`   Jobs to migrate: ${jobsToMigrate.length}`);
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

  // Map to store firebaseId -> MongoDB _id
  const jobIdMap = new Map<string, mongoose.Types.ObjectId>();

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${jobsToMigrate.length} Job records`);
    if (jobsToMigrate[0]) {
      console.log('\n   Sample Job:', JSON.stringify(jobsToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0, jobIdMap };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   Cleaning up existing Jobs (--force)...');
    const existingCount = await Job.countDocuments();
    console.log(`      Deleting ${existingCount} existing jobs...`);
    await Job.deleteMany({});
    console.log('      Done');
  }

  // Insert one by one to capture errors and build jobIdMap
  console.log(`\n   Inserting ${jobsToMigrate.length} jobs...`);
  let migrated = 0;
  let errors = 0;
  const errorDetails: Array<{ index: number; firebaseId: string; error: string }> = [];

  for (let i = 0; i < jobsToMigrate.length; i++) {
    const job = jobsToMigrate[i];
    if (!job) continue;
    try {
      const created = await Job.create(job);
      jobIdMap.set(job.firebaseId as string, created._id as mongoose.Types.ObjectId);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const firebaseId = (job.firebaseId as string) || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      errorDetails.push({ index: i, firebaseId, error: errMsg });
    }
  }

  console.log(`   Jobs inserted: ${migrated}`);
  if (errors > 0) {
    console.log(`   Failed: ${errors}`);
    console.log('\n   First 5 errors:');
    for (const err of errorDetails.slice(0, 5)) {
      console.log(`      [${err.index}] ${err.firebaseId}: ${err.error.slice(0, 100)}`);
    }
  }

  return { migrated, skipped, errors, jobIdMap };
}

// =============================================================================
// MIGRATION - JOB PROPOSALS
// =============================================================================

async function migrateProposals(
  proposalsData: Map<string, FirebaseProposal>,
  jobIdMap: Map<string, mongoose.Types.ObjectId>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  if (proposalsData.size === 0) {
    console.log('\n   No proposals to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  console.log(`\n📥 Processing ${proposalsData.size} proposal records...`);

  // Get user mappings
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

  // Get hub mappings
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

  // Process proposals
  const proposalsToMigrate: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const skipReasons = new Map<string, number>();

  for (const [firebaseProposalId, fbProposal] of proposalsData) {
    if (count >= options.limit) break;

    // Skip if no jobId
    if (!fbProposal.jobId) {
      skipped++;
      skipReasons.set('no_jobId', (skipReasons.get('no_jobId') || 0) + 1);
      count++;
      continue;
    }

    // Get MongoDB Job ID
    const mongoJobId = jobIdMap.get(fbProposal.jobId);
    if (!mongoJobId) {
      skipped++;
      skipReasons.set('job_not_found', (skipReasons.get('job_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Get expert user ID
    const expertFirebaseId = fbProposal.expertId || fbProposal.asssignedExpertId;
    if (!expertFirebaseId) {
      skipped++;
      skipReasons.set('no_expertId', (skipReasons.get('no_expertId') || 0) + 1);
      count++;
      continue;
    }

    const mongoExpertId = userMap.get(expertFirebaseId);
    if (!mongoExpertId) {
      skipped++;
      skipReasons.set('expert_not_found', (skipReasons.get('expert_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Get createdBy user ID (job poster)
    const createdByFirebaseId = fbProposal.createdBy || expertFirebaseId;
    const mongoCreatedBy = userMap.get(createdByFirebaseId) || mongoExpertId;

    // Get hub ID (optional for proposals)
    const mongoHubId = fbProposal.hubId ? hubMap.get(fbProposal.hubId) : undefined;

    // Map status
    const status = mapProposalStatus(fbProposal.status);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Build proposal document
    const proposal: Record<string, unknown> = {
      firebaseId: firebaseProposalId,

      jobId: mongoJobId,
      proposalDetails: truncateText(fbProposal.proposalDetails, 2000) || 'No details provided',
      priceType: mapPricingType(fbProposal.priceType),

      // Pricing
      proposedPrice: fbProposal.proposedPrice || 0,
      hourlyProposedPrice: fbProposal.hourlyProposedPrice || undefined,
      workingHours: fbProposal.workingHours || undefined,

      selectedCurrency: fbProposal.selectedCurrency || 'MYR',
      files: fbProposal.files || [],

      // User references
      createdBy: mongoCreatedBy,
      asssignedExpertId: mongoExpertId,
      expertId: mongoExpertId,

      // Hub reference (if available)
      hubId: mongoHubId,

      status,

      // Review tracking
      isReviewFromClient: false,
      isReviewFromExpert: false,

      // Timestamps
      createdAt: parseTimestamp(fbProposal.createdDate) || new Date(),
      updatedAt: parseTimestamp(fbProposal.createdDate) || new Date(),
    };

    proposalsToMigrate.push(proposal);
    count++;
  }

  console.log(`   Proposals to migrate: ${proposalsToMigrate.length}`);
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
    console.log(`\n   [DRY RUN] Would migrate ${proposalsToMigrate.length} JobProposal records`);
    if (proposalsToMigrate[0]) {
      console.log('\n   Sample Proposal:', JSON.stringify(proposalsToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   Cleaning up existing JobProposals (--force)...');
    const existingCount = await JobProposal.countDocuments();
    console.log(`      Deleting ${existingCount} existing proposals...`);
    await JobProposal.deleteMany({});
    console.log('      Done');
  }

  // Insert one by one to capture errors
  console.log(`\n   Inserting ${proposalsToMigrate.length} proposals...`);
  let migrated = 0;
  let errors = 0;
  const errorDetails: Array<{ index: number; firebaseId: string; error: string }> = [];

  for (let i = 0; i < proposalsToMigrate.length; i++) {
    const proposal = proposalsToMigrate[i];
    if (!proposal) continue;
    try {
      await JobProposal.create(proposal);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const firebaseId = (proposal.firebaseId as string) || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      errorDetails.push({ index: i, firebaseId, error: errMsg });
    }
  }

  console.log(`   Proposals inserted: ${migrated}`);
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
  jobsData: Map<string, FirebaseJob>,
  proposalsData: Map<string, FirebaseProposal>,
  options: MigrationOptions,
): Promise<void> {
  console.log('\n Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log(' Connected to MongoDB');

  try {
    // Migrate jobs first
    const jobsResult = await migrateJobs(jobsData, options);

    // Migrate proposals (needs job ID mapping)
    const proposalsResult = await migrateProposals(proposalsData, jobsResult.jobIdMap, options);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(' MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log('\n   JOBS:');
    console.log(`     Migrated: ${jobsResult.migrated}`);
    console.log(`     Skipped:  ${jobsResult.skipped}`);
    console.log(`     Errors:   ${jobsResult.errors}`);
    console.log('\n   PROPOSALS:');
    console.log(`     Migrated: ${proposalsResult.migrated}`);
    console.log(`     Skipped:  ${proposalsResult.skipped}`);
    console.log(`     Errors:   ${proposalsResult.errors}`);

    if (!options.dryRun) {
      const totalJobs = await Job.countDocuments();
      const totalProposals = await JobProposal.countDocuments();
      console.log('\n Final counts in DB:');
      console.log(`   Total Jobs: ${totalJobs}`);
      console.log(`   Total Proposals: ${totalProposals}`);

      // Show job status distribution
      const jobStats = await Job.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\n   Job status distribution:');
      for (const stat of jobStats) {
        console.log(`     - ${stat._id}: ${stat.count}`);
      }
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

  console.log(' Jobs & Proposals Migration Tool');
  console.log('='.repeat(60));
  console.log(`   Mode:     ${options.dryRun ? 'Dry Run' : isMigrate ? 'Migrate' : 'Analyze'}`);
  console.log(`   Limit:    ${options.limit}`);
  console.log(`   Force:    ${options.force}`);
  console.log('='.repeat(60));

  try {
    // Load data from JSON files
    console.log('\n Loading data from JSON files...');
    const jobsData = loadJobsData();
    const proposalsData = loadProposalsData();
    console.log(`   Loaded ${jobsData.size} jobs`);
    console.log(`   Loaded ${proposalsData.size} proposals`);

    if (isMigrate || options.dryRun) {
      await migrateToMongoDB(jobsData, proposalsData, options);
    } else {
      // Just analyze
      console.log('\n ANALYSIS:');

      const jobStatusCount = new Map<string, number>();
      let withHubId = 0;
      let withProposals = 0;

      for (const [, job] of jobsData) {
        const status = (job.status || 'unknown').toLowerCase();
        jobStatusCount.set(status, (jobStatusCount.get(status) || 0) + 1);

        if (job.hubId) withHubId++;
        if (job.proposals && job.proposals.length > 0) withProposals++;
      }

      console.log(`\n   Jobs: ${jobsData.size}`);
      console.log(`     With hubId: ${withHubId}`);
      console.log(`     With embedded proposals: ${withProposals}`);

      console.log('\n   Jobs by status:');
      for (const [status, count] of jobStatusCount) {
        console.log(`     - ${status}: ${count}`);
      }

      console.log(`\n   Standalone proposals: ${proposalsData.size}`);

      console.log('\nUse --migrate to migrate data or --dry-run to preview changes');
    }

    console.log('\n Done!');
  } catch (error) {
    console.error('\n Error:', error);
    process.exit(1);
  }
}

main();

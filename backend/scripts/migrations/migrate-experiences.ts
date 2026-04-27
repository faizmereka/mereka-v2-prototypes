#!/usr/bin/env tsx

/**
 * Migration Script: Firebase experiences -> MongoDB Experience
 *
 * This script migrates experiences from Firebase JSON dump to MongoDB Experience collection.
 * It reads from data/migrations/experiences_data.json and maps:
 * - experience.hubId (Firebase agency ID) -> Hub._id (via Hub.firebaseId)
 * - experience.createdBy (Firebase UID) -> User._id (via User.firebaseId)
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-experiences.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-experiences.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-experiences.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-experiences.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Experience } from '../../src/core/models/Experience';
import { Hub } from '../../src/core/models/Hub';
import { User } from '../../src/core/models/User';

// =============================================================================
// TYPES - Based on actual Firebase data structure
// =============================================================================

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseLocation {
  country?: string;
  lng?: number;
  city?: string;
  streetAddress?: string;
  postcode?: string;
  autofill?: boolean;
  state?: string;
  lat?: number;
  url?: string;
  location?: string;
}

interface FirebaseHost {
  hubId?: string;
  hubName?: string;
  expertId?: string;
  fullName?: string;
  email?: string;
  access?: string;
  profileUrl?: string;
  inviteHost?: boolean;
  location?: FirebaseLocation;
  learnerProfile?: {
    aboutMe?: string;
  };
}

interface FirebaseSchedule {
  uid?: string;
  slotNo?: number;
  startDate?: string;
  recurringType?: string;
  recurringRule?: string[];
  eventId?: string;
  lockedEvents?: string[];
  isNew?: boolean;
  isEditing?: boolean;
}

interface FirebaseTicket {
  id?: string;
  ticketType?: string;
  ticketName?: string;
  standardRate?: number | null;
  ticketQty?: number | null;
  hasCutoffTime?: boolean;
  cutoffNumber?: number;
  cutoffTime?: string;
  cutoffBeforeAfter?: string;
  description?: string;
  cutoffInMillisecond?: number;
  instantBooking?: string;
  bookPrivateGroup?: string;
  bookingDuration?: string;
  flexibleSlot?: boolean;
}

interface FirebaseTopic {
  theme?: string;
  topic?: string;
  themeIcon?: string;
  isNew?: boolean;
}

interface FirebaseExperience {
  experienceTitle?: string;
  slug?: string;
  experienceDescription?: string;
  experienceType?: string;
  hubId?: string;
  hubName?: string;
  hubLogo?: string;
  experienceCategory?: string;
  experienceTopics?: FirebaseTopic[];
  location?: FirebaseLocation;
  timeZone?: string;
  meetingLink?: string;
  meetingLocation?: string;
  hostDetails?: FirebaseHost[];
  noHost?: boolean;
  hostType?: string;
  audienceType?: string;
  maximumCapacity?: number | string;
  canBookAsPrivate?: boolean | string;
  targetAudience?: string[] | string;
  expertiseLevel?: string;
  expertiseFields?: string[];
  primaryLanguage?: string | null;
  secondaryLanguage?: string[] | null;
  feePaidBy?: string;
  currency?: string;
  ticket?: FirebaseTicket[];
  cutOffTime?: number | string;
  cutOffTimeUnit?: string | null;
  canBookOngoingEvent?: boolean;
  experienceDuration?: number;
  maximunHourGuestCanBook?: string;
  schedules?: FirebaseSchedule[];
  isMultiDay?: boolean;
  coverPhoto?: string;
  gallery?: string[];
  video?: string;
  poster?: string;
  sopPoster?: string;
  learnerOutcome?: string;
  instruction?: string;
  materialProvided?: string[] | string;
  materialNeedToBring?: string[] | string;
  sopInformation?: string;
  customQuestions?: {
    isQuestionMandatory?: boolean;
    questionArray?: unknown[];
  };
  customFormJSON?: unknown;
  status?: string;
  type?: string;
  priority?: number | string;
  isFeatured?: boolean;
  isShowCaseOnProfile?: boolean;
  rating?: number;
  totalNumberOfReview?: number;
  createdBy?: string;
  createdDate?: FirebaseTimestamp;
  updatedAt?: number | string;
  lastModified?: number;
  prevStatus?: string | null;
  isProductCreatedInStripe?: boolean;
  isHostEmailSent?: boolean;
  popularityScore?: number;
  service?: unknown;
}

interface MigrationOptions {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadExperiencesData(): Map<string, FirebaseExperience> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'experiences_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Experiences data not found: ${jsonPath}`);
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseExperience>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function mapStatus(status?: string): 'ACTIVE' | 'DRAFTED' | 'DELETED' | 'EXPIRED' {
  if (!status) return 'DRAFTED';
  const s = status.toLowerCase();
  if (s === 'active') return 'ACTIVE';
  if (s === 'drafted' || s === 'draft') return 'DRAFTED';
  if (s === 'deleted' || s === 'archived') return 'DELETED';
  if (s === 'unlisted' || s === 'pending') return 'DRAFTED';
  if (s === 'express') return 'ACTIVE'; // Express experiences are active
  if (s === 'expired') return 'EXPIRED';
  return 'DRAFTED';
}

function mapExperienceType(type?: string): 'Physical' | 'Virtual' | 'Hybrid' {
  if (!type) return 'Physical';
  const t = type.toLowerCase();
  if (t === 'online' || t === 'virtual') return 'Virtual';
  if (t === 'hybrid') return 'Hybrid';
  return 'Physical';
}

function mapAudienceType(
  type?: string,
): 'Everyone' | 'Members Only' | 'Hidden' | 'PUBLIC' | 'PRIVATE' {
  if (!type) return 'Everyone';
  const t = type.toLowerCase();
  if (t === 'everyone' || t === 'public') return 'Everyone';
  if (t === 'members only' || t === 'members' || t === 'private') return 'Members Only';
  if (t === 'hidden') return 'Hidden';
  return 'Everyone';
}

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

function ensureString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return '';
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

function generateUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  existingSlugs.add(slug);
  return slug;
}

// =============================================================================
// MIGRATION
// =============================================================================

async function migrateExperiences(
  experiences: Map<string, FirebaseExperience>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log(`\n📥 Processing ${experiences.size} experiences...`);

  // Get all MongoDB mappings we need
  console.log('   Loading MongoDB mappings...');

  // 1. Get all migrated hubs: firebaseId -> MongoDB _id
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

  // 2. Get all migrated users: firebaseId -> MongoDB _id
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

  // 3. Get existing slugs to avoid duplicates
  const existingExperiences = await Experience.find({}).select('slug').lean();
  const existingSlugs = new Set<string>(existingExperiences.map((e) => e.slug));
  console.log(`   - ${existingSlugs.size} existing slugs found`);

  // Process experiences
  const experiencesToMigrate: Record<string, unknown>[] = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const typeDistribution = new Map<string, number>();

  for (const [firebaseExpId, fbExp] of experiences) {
    if (count >= options.limit) break;

    // Skip if no hubId
    if (!fbExp.hubId) {
      skipped++;
      count++;
      continue;
    }

    // Map hubId to MongoDB ObjectId
    const mongoHubId = hubMap.get(fbExp.hubId);
    if (!mongoHubId) {
      skipped++;
      count++;
      continue;
    }

    // Map createdBy to MongoDB ObjectId (optional)
    const mongoCreatedBy = fbExp.createdBy ? userMap.get(fbExp.createdBy) : undefined;

    // Generate title if missing
    const title = fbExp.experienceTitle || `Experience ${firebaseExpId.slice(0, 8)}`;

    // Generate unique slug
    let baseSlug = fbExp.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    baseSlug = baseSlug.replace(/^-+|-+$/g, ''); // Trim dashes
    if (!baseSlug) baseSlug = `exp-${firebaseExpId.slice(0, 8)}`;
    const slug = generateUniqueSlug(baseSlug, existingSlugs);

    // Determine listing type
    const listingType =
      fbExp.type === 'express' || fbExp.status === 'express' ? 'express' : 'platform';

    // Map status
    const status = mapStatus(fbExp.status);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Map experience type
    const experienceType = mapExperienceType(fbExp.experienceType);
    typeDistribution.set(experienceType, (typeDistribution.get(experienceType) || 0) + 1);

    // Map host details
    const hostDetails = (fbExp.hostDetails || []).map((host) => ({
      hubId: host.hubId,
      hubName: host.hubName,
      expertId: host.expertId,
      fullName: host.fullName,
      email: host.email,
      access: host.access,
      profileUrl: host.profileUrl,
      description: host.learnerProfile?.aboutMe,
    }));

    // Map schedules
    const schedules = (fbExp.schedules || []).map((sched) => ({
      uid: sched.uid || `schedule-${Math.random().toString(36).slice(2, 10)}`,
      recurringRule: sched.recurringRule || [],
      startDate: sched.startDate || new Date().toISOString(),
      recurringType: sched.recurringType || 'no_repeat',
    }));

    // Map tickets
    const tickets = (fbExp.ticket || []).map((ticket) => ({
      id: ticket.id,
      ticketType: ticket.ticketType || 'Free',
      ticketName: ticket.ticketName || 'General',
      ticketPrice: ticket.standardRate || 0,
      ticketQty: ticket.ticketQty || 0,
      hasCutoffTime: ticket.hasCutoffTime,
      cutoffNumber: ticket.cutoffNumber,
      cutoffTime: ticket.cutoffTime,
      cutoffBeforeAfter: ticket.cutoffBeforeAfter,
      description: ticket.description,
    }));

    // Map topics
    const experienceTopics = (fbExp.experienceTopics || []).map((topic) => ({
      theme: topic.theme || '',
      topic: topic.topic || '',
    }));

    // Map location
    const location = fbExp.location
      ? {
          streetAddress: fbExp.location.streetAddress || '',
          country: fbExp.location.country || '',
          state: fbExp.location.state || '',
          city: fbExp.location.city || '',
          postcode: fbExp.location.postcode || '',
          lat: fbExp.location.lat,
          lng: fbExp.location.lng,
          url: fbExp.location.url,
          autofill: fbExp.location.autofill,
        }
      : undefined;

    // Build experience document
    const experience: Record<string, unknown> = {
      // Firebase ID for tracking
      firebaseId: firebaseExpId,

      // Basic Info
      experienceTitle: title,
      slug,
      experienceDescription: fbExp.experienceDescription || '',
      experienceType,
      hubId: mongoHubId,

      // Category and Topics
      experienceCategory: fbExp.experienceCategory,
      experienceTopics,

      // Location
      location,
      timeZone: fbExp.timeZone,

      // Virtual Meeting
      meetingLink: fbExp.meetingLink,
      meetingLocation: fbExp.meetingLocation,

      // Host Info
      hostDetails,
      noHost: fbExp.noHost || false,
      hostType: fbExp.hostType,

      // Audience
      audienceType: mapAudienceType(fbExp.audienceType),
      maximumCapacity:
        typeof fbExp.maximumCapacity === 'number'
          ? fbExp.maximumCapacity
          : Number.parseInt(String(fbExp.maximumCapacity), 10) || undefined,
      canBookAsPrivate: fbExp.canBookAsPrivate === true || fbExp.canBookAsPrivate === 'yes',
      targetAudience: ensureStringArray(fbExp.targetAudience),
      expertiseLevel: fbExp.expertiseLevel,
      expertiseFields: fbExp.expertiseFields || [],

      // Languages
      primaryLanguage: fbExp.primaryLanguage || 'English',
      secondaryLanguage: ensureStringArray(fbExp.secondaryLanguage),

      // Pricing
      feePaidBy: fbExp.feePaidBy === 'hub' ? 'hub' : 'learner',
      currency: fbExp.currency || 'MYR',

      // Tickets
      ticket: tickets,

      // Booking Settings
      cutOffTime:
        typeof fbExp.cutOffTime === 'number' ? fbExp.cutOffTime : Number(fbExp.cutOffTime) || 0,
      cutOffTimeUnit: fbExp.cutOffTimeUnit,
      canBookOngoingEvent: fbExp.canBookOngoingEvent,
      experienceDuration: fbExp.experienceDuration,

      // Schedules
      schedules,
      isMultiDay: fbExp.isMultiDay,

      // Media
      coverPhoto: fbExp.coverPhoto,
      gallery: fbExp.gallery || [],
      video: fbExp.video,
      poster: fbExp.poster,
      sopPoster: fbExp.sopPoster,

      // Additional Info
      learnerOutcome: fbExp.learnerOutcome,
      instruction: fbExp.instruction,
      materialProvided: ensureString(fbExp.materialProvided),
      materialNeedToBring: ensureString(fbExp.materialNeedToBring),
      sopInformation: fbExp.sopInformation,

      // Custom Questions
      customQuestions: fbExp.customQuestions,
      customFormJSON: fbExp.customFormJSON,

      // Metadata
      status,
      type: fbExp.type || 'platform',
      listingType,
      priority: typeof fbExp.priority === 'number' ? fbExp.priority : 1000,
      isFeatured: fbExp.isFeatured || false,
      isShowCaseOnProfile: fbExp.isShowCaseOnProfile,
      views: 0,
      rating: fbExp.rating,

      // Audit
      createdBy: mongoCreatedBy,
      createdAt: parseTimestamp(fbExp.createdDate) || new Date(),
      updatedAt: parseTimestamp(fbExp.updatedAt || fbExp.lastModified) || new Date(),
    };

    experiencesToMigrate.push(experience);
    count++;
  }

  console.log(`   Experiences to migrate: ${experiencesToMigrate.length}`);
  console.log(`   Skipped (no hub match): ${skipped}`);

  console.log('\n   Status distribution:');
  for (const [status, count] of statusDistribution) {
    console.log(`     - ${status}: ${count}`);
  }

  console.log('\n   Type distribution:');
  for (const [type, count] of typeDistribution) {
    console.log(`     - ${type}: ${count}`);
  }

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${experiencesToMigrate.length} Experience records`);
    if (experiencesToMigrate[0]) {
      console.log('\n   Sample Experience:', JSON.stringify(experiencesToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   🧹 Cleaning up existing Experiences (--force)...');
    const existingCount = await Experience.countDocuments();
    console.log(`      Deleting ${existingCount} existing experiences...`);
    await Experience.deleteMany({});
    console.log('      ✅ Cleanup complete');
  }

  // Insert using Mongoose insertMany
  console.log(`\n   📦 Bulk inserting ${experiencesToMigrate.length} experiences...`);
  let migrated = 0;
  let errors = 0;

  try {
    const result = await Experience.insertMany(experiencesToMigrate, { ordered: false });
    migrated = result.length;
    console.log(`   ✅ Experiences inserted: ${migrated}`);
  } catch (error: unknown) {
    const mongoError = error as {
      insertedDocs?: unknown[];
      writeErrors?: Array<{ errmsg?: string }>;
    };
    migrated = mongoError.insertedDocs?.length || 0;
    errors = mongoError.writeErrors?.length || 0;
    console.log(`   ⚠️  Experiences: ${migrated} inserted, ${errors} errors`);
    if (mongoError.writeErrors && mongoError.writeErrors.length > 0) {
      for (const err of mongoError.writeErrors.slice(0, 3)) {
        const msg = err.errmsg || String(err);
        console.log(`      - ${msg.slice(0, 100)}`);
      }
    }
  }

  return { migrated, skipped, errors };
}

async function migrateToMongoDB(
  experiences: Map<string, FirebaseExperience>,
  options: MigrationOptions,
): Promise<void> {
  console.log('\n💾 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  try {
    const result = await migrateExperiences(experiences, options);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Migrated: ${result.migrated}`);
    console.log(`   Skipped:  ${result.skipped}`);
    console.log(`   Errors:   ${result.errors}`);

    if (!options.dryRun) {
      const totalExperiences = await Experience.countDocuments();
      console.log('\n✅ Final counts in DB:');
      console.log(`   Total Experiences: ${totalExperiences}`);

      // Show status distribution
      const statusStats = await Experience.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\n   Status distribution:');
      for (const stat of statusStats) {
        console.log(`     - ${stat._id}: ${stat.count}`);
      }

      // Show type distribution
      const typeStats = await Experience.aggregate([
        { $group: { _id: '$experienceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\n   Experience type distribution:');
      for (const stat of typeStats) {
        console.log(`     - ${stat._id}: ${stat.count}`);
      }
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
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

  console.log('🚀 Experience Migration Tool');
  console.log('='.repeat(60));
  console.log(`   Mode:     ${options.dryRun ? 'Dry Run' : isMigrate ? 'Migrate' : 'Analyze'}`);
  console.log(`   Limit:    ${options.limit}`);
  console.log(`   Force:    ${options.force}`);
  console.log('='.repeat(60));

  try {
    // Load data from JSON files
    console.log('\n📂 Loading data from JSON file...');
    const experiences = loadExperiencesData();
    console.log(`   Loaded ${experiences.size} experiences`);

    if (isMigrate || options.dryRun) {
      await migrateToMongoDB(experiences, options);
    } else {
      // Just analyze
      console.log('\n📋 ANALYSIS:');

      const statusCount = new Map<string, number>();
      const typeCount = new Map<string, number>();
      let withHubId = 0;
      let withCreatedBy = 0;

      for (const [, exp] of experiences) {
        const status = (exp.status || 'unknown').toLowerCase();
        statusCount.set(status, (statusCount.get(status) || 0) + 1);

        const type = exp.experienceType || 'unknown';
        typeCount.set(type, (typeCount.get(type) || 0) + 1);

        if (exp.hubId) withHubId++;
        if (exp.createdBy) withCreatedBy++;
      }

      console.log(`   Total experiences: ${experiences.size}`);
      console.log(`   With hubId: ${withHubId}`);
      console.log(`   With createdBy: ${withCreatedBy}`);

      console.log('\n   By status:');
      for (const [status, count] of statusCount) {
        console.log(`     - ${status}: ${count}`);
      }

      console.log('\n   By type:');
      for (const [type, count] of typeCount) {
        console.log(`     - ${type}: ${count}`);
      }

      console.log('\nUse --migrate to migrate data or --dry-run to preview changes');
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

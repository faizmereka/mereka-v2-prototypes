#!/usr/bin/env tsx

/**
 * Migration Script: Firebase expertise -> MongoDB Expertise
 *
 * This script migrates expertise from Firebase JSON dump to MongoDB Expertise collection.
 * It reads from data/migrations/expertise_data.json and maps:
 * - expertise.hubId (Firebase agency ID) -> Hub._id (via Hub.firebaseId)
 * - expertise.host.id (Firebase UID) -> User._id (via User.firebaseId)
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-expertise.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-expertise.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-expertise.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-expertise.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { env } from '../../src/core/config/env';
import { Expertise } from '../../src/core/models/Expertise';
import { Hub } from '../../src/core/models/Hub';
import { User } from '../../src/core/models/User';

// =============================================================================
// TYPES - Based on actual Firebase data structure
// =============================================================================

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseHost {
  id?: string;
  name?: string;
  profileUrl?: string;
  description?: string;
}

interface FirebaseTicket {
  id?: string;
  ticketName?: string;
  ticketType?: string;
  standardRate?: number;
  specialRate?: number;
  description?: string;
  expertiseMode?: string;
  sessionDuration?: string;
  estimatedDuration?: string;
  hasBufferTime?: boolean;
  bufferTime?: string;
  canRequestForSession?: boolean;
  hours?: string;
  minutes?: string;
  buyerTotal?: string;
}

interface FirebaseOperatingDay {
  key?: string;
  fullTitle?: string;
  title?: string;
  isActive?: boolean;
  fullDay?: boolean;
  startTime?: string;
  endTime?: string;
}

interface FirebaseOperatingHours {
  autofill?: boolean;
  days?: FirebaseOperatingDay[];
}

interface FirebaseLocation {
  streetAddress?: string;
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
  location?: string;
  lat?: number;
  lng?: number;
  url?: string;
  autofill?: boolean;
}

interface FirebaseCustomQuestion {
  questionLabel?: string;
  questionType?: string;
  saveStatus?: boolean;
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

interface FirebaseCustomQuestions {
  isQuestionMandatory?: boolean;
  questionArray?: FirebaseCustomQuestion[];
}

interface FirebaseExpertise {
  expertiseTitle?: string;
  expertiseDescription?: string;
  expertiseSummary?: string;
  hubId?: string;
  hubName?: string;
  hubLogo?: string;
  host?: FirebaseHost;
  expertiseTypes?: string[];
  primaryLanguage?: string;
  secondaryLanguages?: string[];
  slug?: string;
  location?: FirebaseLocation;
  linkMode?: string;
  expertiseLink?: string;
  displayFullAddress?: boolean;
  coverPhoto?: string;
  gallery?: string[];
  infoForBooker?: string;
  expertiseInstructions?: string;
  customQuestions?: FirebaseCustomQuestions;
  customFormJSON?: unknown;
  feePaidBy?: string;
  operatingHours?: FirebaseOperatingHours;
  availabilityType?: string;
  ticket?: FirebaseTicket[];
  audienceType?: string;
  currency?: string;
  status?: string;
  rating?: number;
  createdDate?: FirebaseTimestamp;
  lastModified?: number;
  updatedAt?: number;
}

interface MigrationOptions {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadExpertiseData(): Map<string, FirebaseExpertise> {
  const jsonPath = path.join(process.cwd(), 'data', 'migrations', 'expertise_data.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Expertise data not found: ${jsonPath}`);
  }
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content) as Record<string, FirebaseExpertise>;
  return new Map(Object.entries(data));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function mapStatus(status?: string): 'draft' | 'published' | 'archived' {
  if (!status) return 'draft';
  const s = status.toLowerCase();
  if (s === 'active' || s === 'published') return 'published';
  if (s === 'archived' || s === 'deleted') return 'archived';
  return 'draft';
}

function mapAvailabilityType(type?: string): 'manual' | 'flexible' {
  if (!type) return 'flexible';
  const t = type.toLowerCase();
  if (t === 'manual') return 'manual';
  // Map 'autofill' and any other value to 'flexible'
  return 'flexible';
}

function mapLinkMode(mode?: string): 'send' | 'display' {
  if (!mode) return 'send';
  const m = mode.toLowerCase();
  if (m === 'display') return 'display';
  // Map 'add' and any other value to 'send'
  return 'send';
}

function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function mapExpertiseMode(mode?: string): 'physical' | 'online' | 'hybrid' {
  if (!mode) return 'online';
  const m = mode.toLowerCase();
  if (m === 'physical' || m === 'offline') return 'physical';
  if (m === 'hybrid') return 'hybrid';
  return 'online';
}

function mapTicketType(type?: string): 'Free' | 'Paid' {
  if (!type) return 'Free';
  return type.toLowerCase() === 'paid' ? 'Paid' : 'Free';
}

function mapQuestionType(type?: string): 'text' | 'dropdown' | 'checkbox' | 'multiple_choice' {
  if (!type) return 'text';
  const t = type.toLowerCase();
  if (t === 'dropdown') return 'dropdown';
  if (t === 'checkbox') return 'checkbox';
  if (t === 'multiple_choice' || t === 'multiplechoice') return 'multiple_choice';
  return 'text';
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

async function migrateExpertise(
  expertiseData: Map<string, FirebaseExpertise>,
  options: MigrationOptions,
): Promise<{ migrated: number; skipped: number; errors: number }> {
  console.log(`\n📥 Processing ${expertiseData.size} expertise records...`);

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
  const existingExpertise = await Expertise.find({}).select('slug').lean();
  const existingSlugs = new Set<string>(existingExpertise.map((e) => e.slug));
  console.log(`   - ${existingSlugs.size} existing slugs found`);

  // Process expertise
  const expertiseToMigrate: Record<string, unknown>[] = [];
  let skipped = 0;
  let count = 0;

  const statusDistribution = new Map<string, number>();
  const skipReasons = new Map<string, number>();

  for (const [firebaseExpId, fbExp] of expertiseData) {
    if (count >= options.limit) break;

    // Skip if no hubId
    if (!fbExp.hubId) {
      skipped++;
      skipReasons.set('no_hubId', (skipReasons.get('no_hubId') || 0) + 1);
      count++;
      continue;
    }

    // Map hubId to MongoDB ObjectId
    const mongoHubId = hubMap.get(fbExp.hubId);
    if (!mongoHubId) {
      skipped++;
      skipReasons.set('hub_not_found', (skipReasons.get('hub_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Map host.id to MongoDB ObjectId (use hubId as fallback for createdBy)
    const hostId = fbExp.host?.id || fbExp.hubId;
    const mongoCreatedBy = userMap.get(hostId) || hubMap.get(fbExp.hubId);
    if (!mongoCreatedBy) {
      skipped++;
      skipReasons.set('createdBy_not_found', (skipReasons.get('createdBy_not_found') || 0) + 1);
      count++;
      continue;
    }

    // Generate title if missing
    const title = fbExp.expertiseTitle || `Expertise ${firebaseExpId.slice(0, 8)}`;

    // Generate unique slug
    let baseSlug = fbExp.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    baseSlug = baseSlug.replace(/^-+|-+$/g, ''); // Trim dashes
    if (!baseSlug) baseSlug = `expertise-${firebaseExpId.slice(0, 8)}`;
    const slug = generateUniqueSlug(baseSlug, existingSlugs);

    // Map status
    const status = mapStatus(fbExp.status);
    statusDistribution.set(status, (statusDistribution.get(status) || 0) + 1);

    // Map host details - ENSURE ALL REQUIRED FIELDS HAVE VALUES
    const host = {
      id: fbExp.host?.id || fbExp.hubId || firebaseExpId,
      name: fbExp.host?.name || fbExp.hubName || 'Host',
      profileUrl:
        fbExp.host?.profileUrl || fbExp.hubLogo || 'https://placeholder.mereka.io/avatar.png',
      description: fbExp.host?.description || fbExp.expertiseSummary || title,
    };

    // Map tickets
    const tickets = (fbExp.ticket || []).map((ticket) => ({
      id: ticket.id || `ticket-${Math.random().toString(36).slice(2, 10)}`,
      ticketName: ticket.ticketName || 'General',
      ticketType: mapTicketType(ticket.ticketType),
      standardRate: ticket.standardRate || 0,
      ticketQty: 999, // Default to unlimited
      description: ticket.description || '',
      expertiseMode: mapExpertiseMode(ticket.expertiseMode),
      sessionDuration: ticket.sessionDuration || '',
      estimatedDuration: ticket.estimatedDuration || '',
      hasBufferTime: ticket.hasBufferTime || false,
      bufferTime: ticket.bufferTime || '',
      canRequestForSession: ticket.canRequestForSession || false,
      flexibleBooking: false,
      hasCutoffTime: false,
      hours: ticket.hours || '',
      minutes: ticket.minutes || '',
    }));

    // Ensure at least one ticket
    if (tickets.length === 0) {
      tickets.push({
        id: `ticket-${Math.random().toString(36).slice(2, 10)}`,
        ticketName: 'General',
        ticketType: 'Free' as const,
        standardRate: 0,
        ticketQty: 999,
        description: '',
        expertiseMode: 'online' as const,
        sessionDuration: '',
        estimatedDuration: '',
        hasBufferTime: false,
        bufferTime: '',
        canRequestForSession: false,
        flexibleBooking: false,
        hasCutoffTime: false,
        hours: '',
        minutes: '',
      });
    }

    // Map operating hours - only include if days have required fields
    let operatingHours: Record<string, unknown> | undefined;
    if (fbExp.operatingHours?.days && fbExp.operatingHours.days.length > 0) {
      // Filter days that have all required fields
      const validDays = fbExp.operatingHours.days
        .filter((day) => day.key && day.fullTitle && day.title)
        .map((day) => ({
          key: day.key || '',
          fullTitle: day.fullTitle || '',
          title: day.title || '',
          isActive: day.isActive || false,
          fullDay: day.fullDay ?? true,
          startTime: day.startTime || '',
          endTime: day.endTime || '',
        }));

      // Only include operatingHours if we have at least one valid day
      if (validDays.length > 0) {
        operatingHours = {
          autofill: fbExp.operatingHours.autofill || false,
          sameOperatingHoursForAll: false,
          allOperatingHours: false,
          days: validDays,
        };
      }
    }

    // Map location (only if it has ALL required fields)
    // Required: streetAddress, country, state, city, postcode, location, lat, lng
    let location: Record<string, unknown> | undefined;
    if (fbExp.location?.streetAddress) {
      const loc = fbExp.location;
      // Only include location if it has meaningful required fields
      if (loc.country && loc.state && loc.city && loc.postcode) {
        location = {
          streetAddress: loc.streetAddress,
          country: loc.country,
          state: loc.state,
          city: loc.city,
          postcode: loc.postcode,
          location: loc.location || loc.streetAddress,
          lat: loc.lat ?? 0,
          lng: loc.lng ?? 0,
          url: loc.url,
          autofill: loc.autofill || false,
        };
      }
    }

    // Map custom questions - filter out invalid questions
    let customQuestions: Record<string, unknown> | undefined;
    if (fbExp.customQuestions?.questionArray && fbExp.customQuestions.questionArray.length > 0) {
      // Filter questions that have required fields
      const validQuestions = fbExp.customQuestions.questionArray
        .filter((q) => q.questionLabel) // questionLabel is required
        .map((q) => ({
          questionLabel: q.questionLabel || 'Question',
          questionType: mapQuestionType(q.questionType),
          saveStatus: q.saveStatus || false,
          dropDown: q.dropDown || [],
          checkBox: q.checkBox || [],
          multipleChoices: q.multipleChoices || [],
        }));

      customQuestions = {
        isQuestionMandatory: fbExp.customQuestions.isQuestionMandatory || false,
        questionArray: validQuestions,
      };
    }

    // ENSURE REQUIRED FIELDS HAVE VALUES
    // Truncate summary to 200 chars if needed
    let summary = fbExp.expertiseSummary || title;
    if (summary.length > 200) {
      summary = `${summary.slice(0, 197)}...`;
    }

    // Build expertise document
    const expertise: Record<string, unknown> = {
      // Firebase ID for tracking
      firebaseId: firebaseExpId,

      // Section 1: Your Expertise (ALL REQUIRED)
      expertiseTitle: title,
      expertiseDescription: fbExp.expertiseDescription || title, // Required - default to title
      expertiseSummary: summary, // Required, max 200
      host, // Required with all subfields
      expertiseTypes: fbExp.expertiseTypes || [],
      primaryLanguage: fbExp.primaryLanguage || 'English', // Required
      secondaryLanguages: fbExp.secondaryLanguages || [],
      slug, // Required

      // Section 2: Booking Details
      location,
      linkMode: mapLinkMode(fbExp.linkMode), // Map 'add' -> 'send'
      expertiseLink: fbExp.expertiseLink || '',
      displayFullAddress: fbExp.displayFullAddress || false,
      coverPhoto: fbExp.coverPhoto || 'https://placeholder.mereka.io/cover.png', // Required - provide default
      gallery: fbExp.gallery || [],
      infoForBooker: truncateText(fbExp.infoForBooker, 500), // Max 500 chars
      expertiseInstructions: truncateText(fbExp.expertiseInstructions, 500), // Max 500 chars
      customQuestions,

      // Section 3: Pricing
      feePaidBy: fbExp.feePaidBy || 'learner',
      operatingHours,
      availabilityType: mapAvailabilityType(fbExp.availabilityType), // Map 'autofill' -> 'flexible'
      ticket: tickets, // Required - at least one
      audienceType: fbExp.audienceType || 'Everyone',

      // Additional Fields
      hubId: mongoHubId, // Required
      createdBy: mongoCreatedBy, // Required
      status,
      currency: fbExp.currency || 'MYR',
      rating: fbExp.rating,
      isDisabled: false,
      mandatoryQuestionsForBooking: fbExp.customQuestions?.isQuestionMandatory || false,

      // Timestamps
      createdDate: parseTimestamp(fbExp.createdDate) || new Date(),
      lastModified: parseTimestamp(fbExp.lastModified || fbExp.updatedAt) || new Date(),
      createdAt: parseTimestamp(fbExp.createdDate) || new Date(),
      updatedAt: parseTimestamp(fbExp.lastModified || fbExp.updatedAt) || new Date(),
    };

    expertiseToMigrate.push(expertise);
    count++;
  }

  console.log(`   Expertise to migrate: ${expertiseToMigrate.length}`);
  console.log(`   Skipped (no hub/user match): ${skipped}`);

  if (skipReasons.size > 0) {
    console.log('\n   Skip reasons:');
    for (const [reason, count] of skipReasons) {
      console.log(`     - ${reason}: ${count}`);
    }
  }

  console.log('\n   Status distribution:');
  for (const [status, count] of statusDistribution) {
    console.log(`     - ${status}: ${count}`);
  }

  if (options.dryRun) {
    console.log(`\n   [DRY RUN] Would migrate ${expertiseToMigrate.length} Expertise records`);
    if (expertiseToMigrate[0]) {
      console.log('\n   Sample Expertise:', JSON.stringify(expertiseToMigrate[0], null, 2));
    }
    return { migrated: 0, skipped, errors: 0 };
  }

  // Cleanup if --force
  if (options.force) {
    console.log('\n   🧹 Cleaning up existing Expertise (--force)...');
    const existingCount = await Expertise.countDocuments();
    console.log(`      Deleting ${existingCount} existing expertise...`);
    await Expertise.deleteMany({});
    console.log('      ✅ Cleanup complete');
  }

  // Insert one by one to capture all validation errors
  console.log(
    `\n   📦 Inserting ${expertiseToMigrate.length} expertise (one-by-one for error tracking)...`,
  );
  let migrated = 0;
  let errors = 0;
  const errorDetails: Array<{ index: number; firebaseId: string; error: string }> = [];

  for (let i = 0; i < expertiseToMigrate.length; i++) {
    const expertise = expertiseToMigrate[i];
    if (!expertise) continue;
    try {
      await Expertise.create(expertise);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const firebaseId = (expertise.firebaseId as string) || 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      errorDetails.push({ index: i, firebaseId, error: errMsg });
    }
  }

  console.log(`   ✅ Expertise inserted: ${migrated}`);
  if (errors > 0) {
    console.log(`   ❌ Failed: ${errors}`);
    console.log('\n   First 10 errors:');
    for (const err of errorDetails.slice(0, 10)) {
      console.log(`      [${err.index}] ${err.firebaseId}: ${err.error.slice(0, 120)}`);
    }
  }

  return { migrated, skipped, errors };
}

async function migrateToMongoDB(
  expertiseData: Map<string, FirebaseExpertise>,
  options: MigrationOptions,
): Promise<void> {
  console.log('\n💾 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  try {
    const result = await migrateExpertise(expertiseData, options);

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Migrated: ${result.migrated}`);
    console.log(`   Skipped:  ${result.skipped}`);
    console.log(`   Errors:   ${result.errors}`);

    if (!options.dryRun) {
      const totalExpertise = await Expertise.countDocuments();
      console.log('\n✅ Final counts in DB:');
      console.log(`   Total Expertise: ${totalExpertise}`);

      // Show status distribution
      const statusStats = await Expertise.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\n   Status distribution:');
      for (const stat of statusStats) {
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

  console.log('🚀 Expertise Migration Tool');
  console.log('='.repeat(60));
  console.log(`   Mode:     ${options.dryRun ? 'Dry Run' : isMigrate ? 'Migrate' : 'Analyze'}`);
  console.log(`   Limit:    ${options.limit}`);
  console.log(`   Force:    ${options.force}`);
  console.log('='.repeat(60));

  try {
    // Load data from JSON files
    console.log('\n📂 Loading data from JSON file...');
    const expertiseData = loadExpertiseData();
    console.log(`   Loaded ${expertiseData.size} expertise records`);

    if (isMigrate || options.dryRun) {
      await migrateToMongoDB(expertiseData, options);
    } else {
      // Just analyze
      console.log('\n📋 ANALYSIS:');

      const statusCount = new Map<string, number>();
      let withHubId = 0;
      let withHost = 0;

      for (const [, exp] of expertiseData) {
        const status = (exp.status || 'unknown').toLowerCase();
        statusCount.set(status, (statusCount.get(status) || 0) + 1);

        if (exp.hubId) withHubId++;
        if (exp.host?.id) withHost++;
      }

      console.log(`   Total expertise: ${expertiseData.size}`);
      console.log(`   With hubId: ${withHubId}`);
      console.log(`   With host.id: ${withHost}`);

      console.log('\n   By status:');
      for (const [status, count] of statusCount) {
        console.log(`     - ${status}: ${count}`);
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

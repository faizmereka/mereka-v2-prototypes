#!/usr/bin/env tsx

/**
 * Migration Script: Firebase bookingTransaction -> MongoDB Booking
 *
 * This script migrates booking transactions from Firebase JSON dump to MongoDB Booking collection.
 * Only migrates experience, expertise, and space bookings (NOT job payments).
 *
 * Mappings:
 * - bookingTransaction.hubId (Firebase) -> Hub._id (via Hub.firebaseId)
 * - bookingTransaction.bookedBy (Firebase UID) -> User._id (via User.firebaseId)
 * - bookingTransaction.serviceId (Firebase) -> Experience/Expertise._id (via firebaseId)
 * - eventId is NOT migrated (ExperienceEvent not migrated yet)
 *
 * Usage:
 *   # Dry run (analyze without migrating)
 *   npx tsx scripts/migrations/migrate-bookings.ts --dry-run
 *
 *   # Migrate to MongoDB
 *   npx tsx scripts/migrations/migrate-bookings.ts --migrate
 *
 *   # Force migrate (delete existing records)
 *   npx tsx scripts/migrations/migrate-bookings.ts --migrate --force
 *
 *   # Limit number of records
 *   npx tsx scripts/migrations/migrate-bookings.ts --migrate --limit=100
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface FirebaseLearnerDetail {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  attendance?: boolean;
  attendanceDate?: FirebaseTimestamp | string;
  ticketId?: string;
  ticketName?: string;
  ticketType?: string;
  isBooker?: boolean;
  isEmailSent?: boolean;
}

interface FirebaseSelectedTicket {
  id: string;
  numberOfSelectedTickets: number;
  standardRate: number;
  ticketName: string;
  ticketType?: string;
  ticketPeriod?: string;
  sessionDuration?: string;
  expertiseMode?: string;
  specialRate?: string;
  ticketQty?: number;
}

interface FirebaseBookingTransaction {
  // Core
  serviceType?: string;
  serviceId?: string;
  hubId?: string;
  bookedBy?: string;
  eventId?: string;
  scheduleId?: string;

  // Dates
  bookingStartDate?: string;
  bookingEndDate?: string;
  timeZone?: string;

  // Participants
  learnerDetail?: FirebaseLearnerDetail[];
  selectedTickets?: FirebaseSelectedTicket[];

  // Pricing
  totalCost?: number;
  currency?: string;
  discountAmount?: number;
  refundAmount?: number;

  // Fees
  merekaFees?: number;
  totalStripeFee?: number;
  transferAmount?: number;
  lastAmountAddedByMereka?: number;

  // Stripe fee responsibility
  stripeFeePayBy?: string;

  // Status
  status?: string;
  merekaStatus?: string;
  disputeStatus?: string;

  // Stripe payment
  stripeTransactionId?: string;
  paymentIntentId?: string;
  stripeResponse?: Record<string, unknown>;
  refundResponse?: Record<string, unknown>;

  // Card info
  cardId?: string;
  cardType?: string;
  cardLastDigit?: string;

  // Flags
  isFree?: boolean;
  isMalaysian?: boolean;
  isPrivateBooking?: boolean | string;
  isWalkingBooking?: boolean;
  canBookOngoingEvent?: boolean;

  // Coupons
  isCouponUsed?: boolean;
  isHubCouponUsed?: boolean;
  promotionCode?: string;
  isDiscoveryPassBooking?: boolean;

  // Status flags
  isRedeemDone?: boolean;
  isMoneyTransferred?: boolean | string;
  isRefunded?: boolean;
  isScholarBooking?: boolean;

  // Notification tracking
  isBookingSuccessNotificationSentToExpert?: boolean;
  isBookingSuccessNotificationSentToLearner?: boolean;
  isBookingRejectNotificationSentToExpert?: boolean;
  isBookingRejectNotificationSentToLearner?: boolean;
  isBookingWithdrawalNotificationSentToLearner?: boolean;
  isBookingWithdrawalNotificationSentToExpert?: boolean;

  // Cancellation
  cancelledBy?: string;
  cancelledDate?: FirebaseTimestamp;
  cancellationReason?: string;

  // Additional
  addedByHub?: boolean | string;
  phoneNumber?: string;

  // UTM
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;

  // Questionnaire
  questionnaireFormData?: unknown[];

  // Timestamps
  createdDate?: FirebaseTimestamp;
  lastUpdated?: FirebaseTimestamp;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function firebaseTimestampToDate(timestamp?: FirebaseTimestamp): Date | undefined {
  if (!timestamp || !timestamp._seconds) return undefined;
  return new Date(timestamp._seconds * 1000);
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapBookingStatus(status?: string, merekaStatus?: string, isFree?: boolean): BookingStatus {
  const s = status?.toLowerCase() || merekaStatus?.toLowerCase() || '';

  // Explicit status mappings
  if (s === 'succeeded' || s === 'active') return BookingStatus.ACTIVE;
  if (s === 'completed') return BookingStatus.COMPLETED;
  if (s === 'cancelled' || s === 'canceled') return BookingStatus.CANCELLED;
  if (s === 'rejected') return BookingStatus.REJECTED;
  if (s === 'withdrawn') return BookingStatus.WITHDRAWN;
  if (s === 'expired') return BookingStatus.EXPIRED;

  // For free bookings with no/empty status, default to ACTIVE (no payment needed)
  if (isFree && (s === 'pending' || s === '')) return BookingStatus.ACTIVE;

  // For paid bookings with pending/empty status
  if (s === 'pending' || s === '') return BookingStatus.PENDING;

  return BookingStatus.ACTIVE; // Default for succeeded payments
}

function mapStripeStatus(status?: string, isFree?: boolean): StripePaymentStatus {
  const s = status?.toLowerCase() || '';

  // For free bookings, mark as succeeded (no payment needed)
  if (isFree) return StripePaymentStatus.SUCCEEDED;

  if (s === 'succeeded') return StripePaymentStatus.SUCCEEDED;
  if (s === 'pending' || s === '') return StripePaymentStatus.PENDING;
  if (s === 'requires_payment_method') return StripePaymentStatus.REQUIRES_PAYMENT_METHOD;
  if (s === 'requires_confirmation') return StripePaymentStatus.REQUIRES_CONFIRMATION;
  if (s === 'requires_action') return StripePaymentStatus.REQUIRES_ACTION;
  if (s === 'processing') return StripePaymentStatus.PROCESSING;
  if (s === 'requires_capture') return StripePaymentStatus.REQUIRES_CAPTURE;
  if (s === 'canceled') return StripePaymentStatus.CANCELED;
  if (s === 'failed') return StripePaymentStatus.FAILED;

  return StripePaymentStatus.PENDING;
}

function mapDisputeStatus(status?: string): DisputeStatus {
  const s = status?.toLowerCase() || '';

  if (s === 'opened') return DisputeStatus.OPENED;
  if (s === 'under_review') return DisputeStatus.UNDER_REVIEW;
  if (s === 'won') return DisputeStatus.WON;
  if (s === 'lost') return DisputeStatus.LOST;
  if (s === 'closed') return DisputeStatus.CLOSED;

  return DisputeStatus.NONE;
}

function mapPayBy(payBy?: string): PayBy | undefined {
  const s = payBy?.toLowerCase() || '';

  if (s === 'hub') return PayBy.HUB;
  if (s === 'learner') return PayBy.LEARNER;

  return undefined;
}

function mapBookingType(serviceType?: string): BookingType | null {
  const s = serviceType?.toLowerCase() || '';

  if (s === 'experience') return BookingType.EXPERIENCE;
  if (s === 'expertise') return BookingType.EXPERTISE;
  if (s === 'space') return BookingType.SPACE;

  return null; // Not a booking type we migrate
}

// =============================================================================
// ID MAPPING CACHE
// =============================================================================

interface IdMappings {
  hubMap: Map<string, mongoose.Types.ObjectId>;
  userMap: Map<string, mongoose.Types.ObjectId>;
  experienceMap: Map<string, mongoose.Types.ObjectId>;
  expertiseMap: Map<string, mongoose.Types.ObjectId>;
}

async function buildIdMappings(): Promise<IdMappings> {
  console.log('\n📊 Building ID mappings from MongoDB...');

  // Build hub mapping
  const hubs = await Hub.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const hubMap = new Map<string, mongoose.Types.ObjectId>();
  for (const hub of hubs) {
    if (hub.firebaseId) {
      hubMap.set(hub.firebaseId, hub._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   Hubs: ${hubMap.size} mapped`);

  // Build user mapping
  const users = await User.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const userMap = new Map<string, mongoose.Types.ObjectId>();
  for (const user of users) {
    if (user.firebaseId) {
      userMap.set(user.firebaseId, user._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   Users: ${userMap.size} mapped`);

  // Build experience mapping
  const experiences = await Experience.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const experienceMap = new Map<string, mongoose.Types.ObjectId>();
  for (const exp of experiences) {
    if (exp.firebaseId) {
      experienceMap.set(exp.firebaseId, exp._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   Experiences: ${experienceMap.size} mapped`);

  // Build expertise mapping
  const expertiseList = await Expertise.find({ firebaseId: { $exists: true, $ne: null } })
    .select('_id firebaseId')
    .lean();
  const expertiseMap = new Map<string, mongoose.Types.ObjectId>();
  for (const exp of expertiseList) {
    if (exp.firebaseId) {
      expertiseMap.set(exp.firebaseId, exp._id as mongoose.Types.ObjectId);
    }
  }
  console.log(`   Expertise: ${expertiseMap.size} mapped`);

  return { hubMap, userMap, experienceMap, expertiseMap };
}

// =============================================================================
// MIGRATION LOGIC
// =============================================================================

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  byType: Record<string, number>;
  skipReasons: Record<string, number>;
}

async function migrateBookings(
  bookingTransactions: Record<string, FirebaseBookingTransaction>,
  mappings: IdMappings,
  options: { dryRun: boolean; limit?: number },
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    byType: {},
    skipReasons: {},
  };

  const bulkOps: Record<string, unknown>[] = [];
  const entries = Object.entries(bookingTransactions);
  const toProcess = options.limit ? entries.slice(0, options.limit) : entries;

  console.log(`\n📦 Processing ${toProcess.length} booking transactions...`);

  for (const [firebaseId, fbBooking] of toProcess) {
    stats.total++;

    try {
      // Check if it's a booking type we migrate
      const bookingType = mapBookingType(fbBooking.serviceType);
      if (!bookingType) {
        stats.skipped++;
        stats.skipReasons[`not_booking_type_${fbBooking.serviceType || 'none'}`] =
          (stats.skipReasons[`not_booking_type_${fbBooking.serviceType || 'none'}`] || 0) + 1;
        continue;
      }

      stats.byType[bookingType] = (stats.byType[bookingType] || 0) + 1;

      // Map hubId
      const mongoHubId = fbBooking.hubId ? mappings.hubMap.get(fbBooking.hubId) : undefined;
      if (!mongoHubId) {
        stats.skipped++;
        stats.skipReasons.hub_not_found = (stats.skipReasons.hub_not_found || 0) + 1;
        continue;
      }

      // Map serviceId based on booking type
      let mongoServiceId: mongoose.Types.ObjectId | undefined;
      if (bookingType === BookingType.EXPERIENCE && fbBooking.serviceId) {
        mongoServiceId = mappings.experienceMap.get(fbBooking.serviceId);
      } else if (bookingType === BookingType.EXPERTISE && fbBooking.serviceId) {
        mongoServiceId = mappings.expertiseMap.get(fbBooking.serviceId);
      } else if (bookingType === BookingType.SPACE && fbBooking.serviceId) {
        // Space not migrated yet, skip
        stats.skipped++;
        stats.skipReasons.space_not_migrated = (stats.skipReasons.space_not_migrated || 0) + 1;
        continue;
      }

      if (!mongoServiceId) {
        stats.skipped++;
        stats.skipReasons[`${bookingType}_not_found`] =
          (stats.skipReasons[`${bookingType}_not_found`] || 0) + 1;
        continue;
      }

      // Map bookedBy (optional - can be guest booking)
      const mongoBookedBy = fbBooking.bookedBy
        ? mappings.userMap.get(fbBooking.bookedBy)
        : undefined;

      // Map cancelledBy
      const mongoCancelledBy = fbBooking.cancelledBy
        ? mappings.userMap.get(fbBooking.cancelledBy)
        : undefined;

      // Parse dates
      const bookingStartDate = parseDate(fbBooking.bookingStartDate);
      const bookingEndDate = parseDate(fbBooking.bookingEndDate);

      if (!bookingStartDate || !bookingEndDate) {
        stats.skipped++;
        stats.skipReasons.invalid_dates = (stats.skipReasons.invalid_dates || 0) + 1;
        continue;
      }

      // Map learner details
      const learnerDetail = (fbBooking.learnerDetail || []).map((ld, idx) => ({
        id: ld.id ?? idx + 1,
        name: ld.name || 'Unknown',
        email: ld.email || 'unknown@example.com',
        phone: ld.phone,
        attendance: ld.attendance ?? false,
        attendanceDate:
          typeof ld.attendanceDate === 'string'
            ? parseDate(ld.attendanceDate)
            : firebaseTimestampToDate(ld.attendanceDate as FirebaseTimestamp),
        ticketId: ld.ticketId,
        ticketName: ld.ticketName,
        ticketType: ld.ticketType,
        isBooker: ld.isBooker ?? false,
        isEmailSent: ld.isEmailSent ?? false,
      }));

      if (learnerDetail.length === 0) {
        stats.skipped++;
        stats.skipReasons.no_learner_detail = (stats.skipReasons.no_learner_detail || 0) + 1;
        continue;
      }

      // Map selected tickets
      const selectedTickets = (fbBooking.selectedTickets || []).map((st) => ({
        id: st.id || 'default',
        numberOfSelectedTickets: st.numberOfSelectedTickets || 1,
        standardRate: st.standardRate || 0,
        ticketName: st.ticketName || 'Ticket',
        ticketType: st.ticketType,
        ticketPeriod: st.ticketPeriod,
        sessionDuration: st.sessionDuration,
        expertiseMode: st.expertiseMode,
      }));

      if (selectedTickets.length === 0) {
        // Create default ticket from totalCost
        selectedTickets.push({
          id: 'default',
          numberOfSelectedTickets: 1,
          standardRate: fbBooking.totalCost || 0,
          ticketName: fbBooking.isFree ? 'Free Ticket' : 'Paid Ticket',
          ticketType: fbBooking.isFree ? 'Free' : 'Paid',
          ticketPeriod: undefined,
          sessionDuration: undefined,
          expertiseMode: undefined,
        });
      }

      // Build booking document
      const booking: Record<string, unknown> = {
        firebaseId,
        bookingType,
        serviceId: mongoServiceId,
        hubId: mongoHubId,
        bookedBy: mongoBookedBy,
        // eventId: NOT SET - ExperienceEvent not migrated
        scheduleId: fbBooking.scheduleId,

        bookingStartDate,
        bookingEndDate,
        timeZone: fbBooking.timeZone || 'Asia/Kuala_Lumpur',

        learnerDetail,
        selectedTickets,

        totalCost: fbBooking.totalCost || 0,
        currency: fbBooking.currency?.toUpperCase() || 'MYR',
        discountAmount: fbBooking.discountAmount || 0,
        refundAmount: fbBooking.refundAmount || 0,

        platformFee: fbBooking.merekaFees || 0,
        platformFeeRate: 0.15,
        stripeFee: fbBooking.totalStripeFee || 0,
        transferAmount: fbBooking.transferAmount || fbBooking.lastAmountAddedByMereka || 0,

        stripeFeePayBy: mapPayBy(fbBooking.stripeFeePayBy),

        status: mapBookingStatus(fbBooking.status, fbBooking.merekaStatus, fbBooking.isFree),
        stripeStatus: mapStripeStatus(fbBooking.status, fbBooking.isFree),
        disputeStatus: mapDisputeStatus(fbBooking.disputeStatus),

        stripePaymentIntentId: fbBooking.stripeTransactionId || fbBooking.paymentIntentId,
        stripeResponse: fbBooking.stripeResponse,
        refundResponse: fbBooking.refundResponse,

        cardId: fbBooking.cardId,
        cardType: fbBooking.cardType,
        cardLastDigit: fbBooking.cardLastDigit,

        isFree: fbBooking.isFree ?? false,
        isMalaysian: fbBooking.isMalaysian ?? false,
        isPrivateBooking:
          typeof fbBooking.isPrivateBooking === 'boolean' ? fbBooking.isPrivateBooking : false,
        isWalkingBooking: fbBooking.isWalkingBooking ?? false,
        canBookOngoingEvent: fbBooking.canBookOngoingEvent ?? false,

        isCouponUsed: fbBooking.isCouponUsed ?? false,
        isHubCouponUsed: fbBooking.isHubCouponUsed ?? false,
        promotionCode: fbBooking.promotionCode,
        isDiscoveryPassBooking: fbBooking.isDiscoveryPassBooking ?? false,

        isRedeemDone: fbBooking.isRedeemDone ?? false,
        isMoneyTransferred:
          typeof fbBooking.isMoneyTransferred === 'boolean'
            ? fbBooking.isMoneyTransferred
              ? 'true'
              : 'false'
            : fbBooking.isMoneyTransferred,
        isRefunded: fbBooking.isRefunded ?? false,
        isScholarBooking: fbBooking.isScholarBooking ?? false,

        isBookingSuccessNotificationSentToExpert:
          fbBooking.isBookingSuccessNotificationSentToExpert ?? false,
        isBookingSuccessNotificationSentToLearner:
          fbBooking.isBookingSuccessNotificationSentToLearner ?? false,
        isBookingRejectNotificationSentToExpert:
          fbBooking.isBookingRejectNotificationSentToExpert ?? false,
        isBookingRejectNotificationSentToLearner:
          fbBooking.isBookingRejectNotificationSentToLearner ?? false,
        isBookingWithdrawalNotificationSentToLearner:
          fbBooking.isBookingWithdrawalNotificationSentToLearner ?? false,
        isBookingWithdrawalNotificationSentToExpert:
          fbBooking.isBookingWithdrawalNotificationSentToExpert ?? false,

        cancelledBy: mongoCancelledBy,
        cancelledDate: firebaseTimestampToDate(fbBooking.cancelledDate),
        cancellationReason: fbBooking.cancellationReason,

        phoneNumber: fbBooking.phoneNumber,

        utm_medium: fbBooking.utm_medium,
        utm_campaign: fbBooking.utm_campaign,
        utm_term: fbBooking.utm_term,
        utm_content: fbBooking.utm_content,
        utm_id: fbBooking.utm_id,

        questionnaireFormData: fbBooking.questionnaireFormData || [],

        createdAt: firebaseTimestampToDate(fbBooking.createdDate) || new Date(),
        updatedAt: firebaseTimestampToDate(fbBooking.lastUpdated) || new Date(),
      };

      bulkOps.push(booking);
      stats.migrated++;

      if (stats.total % 1000 === 0) {
        console.log(`   Processed ${stats.total} records...`);
      }
    } catch (error) {
      stats.errors++;
      console.error(
        `   ❌ Error preparing ${firebaseId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  // Bulk insert
  if (!options.dryRun && bulkOps.length > 0) {
    console.log(`\n📥 Bulk inserting ${bulkOps.length} bookings...`);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      await Booking.insertMany(batch, { ordered: false });
      console.log(
        `   Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bulkOps.length / BATCH_SIZE)} (${batch.length} records)`,
      );
    }
  }

  return stats;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const migrate = args.includes('--migrate');
  const force = args.includes('--force');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '0', 10) : undefined;

  if (!dryRun && !migrate) {
    console.log('Usage:');
    console.log('  npx tsx scripts/migrations/migrate-bookings.ts --dry-run');
    console.log('  npx tsx scripts/migrations/migrate-bookings.ts --migrate');
    console.log('  npx tsx scripts/migrations/migrate-bookings.ts --migrate --force');
    console.log('  npx tsx scripts/migrations/migrate-bookings.ts --migrate --limit=100');
    process.exit(1);
  }

  console.log('🚀 Booking Migration Script');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'MIGRATE'}`);
  if (force) console.log('   Force: YES (will delete existing records)');
  if (limit) console.log(`   Limit: ${limit} records`);

  // Load Firebase data
  const dataPath = path.join(__dirname, '../../data/migrations/bookingTransaction_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found: ${dataPath}`);
    process.exit(1);
  }

  console.log('\n📂 Loading Firebase data...');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const bookingTransactions: Record<string, FirebaseBookingTransaction> = JSON.parse(rawData);
  console.log(`   Loaded ${Object.keys(bookingTransactions).length} booking transactions`);

  // Filter to only booking types (experience, expertise, space)
  const bookingEntries = Object.entries(bookingTransactions).filter(([_, bt]) => {
    const st = bt.serviceType?.toLowerCase();
    return st === 'experience' || st === 'expertise' || st === 'space';
  });
  console.log(`   Found ${bookingEntries.length} booking-type transactions to migrate`);

  // Connect to MongoDB
  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('   Connected!');

  try {
    // Force delete if requested
    if (force && migrate) {
      console.log('\n🗑️  Force mode: Deleting existing bookings with firebaseId...');
      const deleteResult = await Booking.deleteMany({ firebaseId: { $exists: true } });
      console.log(`   Deleted ${deleteResult.deletedCount} existing records`);
    }

    // Build ID mappings
    const mappings = await buildIdMappings();

    // Run migration
    const filteredData = Object.fromEntries(bookingEntries);
    const stats = await migrateBookings(filteredData, mappings, { dryRun, limit });

    // Print results
    console.log('\n📊 Migration Results:');
    console.log(`   Total processed: ${stats.total}`);
    console.log(`   Migrated: ${stats.migrated}`);
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);

    console.log('\n   By Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`     ${type}: ${count}`);
    }

    console.log('\n   Skip Reasons:');
    for (const [reason, count] of Object.entries(stats.skipReasons)) {
      console.log(`     ${reason}: ${count}`);
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No data was written to MongoDB');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Done!');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

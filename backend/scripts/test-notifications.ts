/**
 * Test script for notification system
 * Tests each notification trigger by calling the communicationTriggerService directly
 */

import mongoose from 'mongoose';
import { env } from '../src/core/config/env';
import { Email } from '../src/core/models/Email';
import { Hub } from '../src/core/models/Hub';
import { InAppNotificationLog } from '../src/core/models/InAppNotificationLog';
// Models
import { User } from '../src/core/models/User';
import { WhatsAppLog } from '../src/core/models/WhatsAppLog';

// Service
import { communicationTriggerService } from '../src/core/services/shared/communications/communicationTrigger.service';

interface TestResult {
  templateId: string;
  success: boolean;
  inApp?: boolean;
  email?: boolean;
  whatsApp?: boolean;
  error?: string;
}

const results: TestResult[] = [];

// Global user info for tests (set in runTests)
let globalUserEmail = 'test@example.com';
let globalUserPhone = '+60123456789';

async function testNotification(
  templateId: string,
  userId: string,
  hubId: string | undefined,
  data: Record<string, unknown>,
  channels: ('inApp' | 'email' | 'whatsApp')[] = ['inApp', 'email', 'whatsApp'],
): Promise<TestResult> {
  try {
    console.log(`\n📧 Testing: ${templateId}...`);

    // Always include userEmail and userPhone for email/whatsapp to work
    const enhancedData = {
      ...data,
      userEmail: data.userEmail || globalUserEmail,
      userPhone: data.userPhone || globalUserPhone,
    };

    const result = await communicationTriggerService.triggerCommunication({
      templateId,
      userId,
      hubId,
      data: enhancedData,
      channels,
    });

    const testResult: TestResult = {
      templateId,
      success: true,
      inApp: result.inApp.sent,
      email: result.email.sent,
      whatsApp: result.whatsApp.sent,
    };

    if (result.inApp.error) testResult.error = result.inApp.error;
    if (result.email.error) testResult.error = result.email.error;
    if (result.whatsApp.error) testResult.error = result.whatsApp.error;

    console.log(
      `   ✅ InApp: ${result.inApp.sent ? '✓' : '✗'} | Email: ${result.email.sent ? '✓' : '✗'} | WhatsApp: ${result.whatsApp.sent ? '✓' : '✗'}`,
    );

    return testResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`   ❌ Error: ${errorMessage}`);
    return {
      templateId,
      success: false,
      error: errorMessage,
    };
  }
}

async function runTests() {
  console.log('🔔 Starting Notification Tests...\n');
  console.log('='.repeat(60));

  // Connect to MongoDB
  console.log('\n📡 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Get a test user and hub
  let testUser = await User.findOne({ email: 'admin@mereka.io' }).lean();
  if (!testUser) {
    // Try to find any user
    testUser = await User.findOne({}).lean();
  }
  const testHub = await Hub.findOne({}).lean();

  if (!testUser) {
    console.log('❌ No test user found. Run seed-admin.ts first.');
    await mongoose.disconnect();
    return;
  }

  const userId = testUser._id.toString();
  const hubId = testHub?._id?.toString();
  // Get user email and phone for email/whatsapp tests
  globalUserEmail = testUser.email || 'test@example.com';
  globalUserPhone = (testUser as unknown as { phone?: string }).phone || '+60123456789';

  console.log(`📋 Test User: ${testUser.name} (${globalUserEmail})`);
  console.log(`📋 Test Phone: ${globalUserPhone}`);
  console.log(`📋 Test Hub: ${testHub?.name || 'None'}`);
  console.log(`\n${'='.repeat(60)}`);

  // Get counts before tests
  const beforeCounts = {
    inApp: await InAppNotificationLog.countDocuments({ userId }),
    email: await Email.countDocuments({}),
    whatsApp: await WhatsAppLog.countDocuments({}),
  };

  console.log(
    `\n📊 Before: ${beforeCounts.inApp} inApp, ${beforeCounts.email} email, ${beforeCounts.whatsApp} whatsApp`,
  );

  // ========================
  // SYSTEM NOTIFICATIONS
  // ========================
  console.log('\n\n📁 SYSTEM NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification('WELCOME_USER', userId, undefined, {
      userName: testUser.name,
      userEmail: testUser.email,
    }),
  );

  results.push(
    await testNotification(
      'EMAIL_VERIFICATION',
      userId,
      undefined,
      {
        userName: testUser.name,
        verificationLink: 'https://example.com/verify/abc123',
      },
      ['email'],
    ),
  );

  results.push(
    await testNotification(
      'PASSWORD_RESET_LINK',
      userId,
      undefined,
      {
        userName: testUser.name,
        resetLink: 'https://example.com/reset/xyz789',
        expiryMinutes: 60,
      },
      ['email'],
    ),
  );

  results.push(
    await testNotification('PASSWORD_RESET_SUCCESS', userId, undefined, {
      userName: testUser.name,
    }),
  );

  results.push(
    await testNotification('PASSWORD_CHANGED', userId, undefined, {
      userName: testUser.name,
    }),
  );

  // ========================
  // BOOKING NOTIFICATIONS
  // ========================
  console.log('\n\n📁 BOOKING NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification('BOOKING_CONFIRMED_LEARNER', userId, hubId, {
      userName: testUser.name,
      experienceName: 'Test Experience',
      bookingDate: '2025-02-15',
      bookingTime: '10:00 AM',
      hubName: testHub?.name || 'Test Hub',
      expertName: 'Test Expert',
      bookingId: 'booking123',
    }),
  );

  results.push(
    await testNotification('BOOKING_CONFIRMED_EXPERT', userId, hubId, {
      userName: testUser.name,
      learnerName: 'Test Learner',
      experienceName: 'Test Experience',
      bookingDate: '2025-02-15',
      bookingTime: '10:00 AM',
    }),
  );

  results.push(
    await testNotification('BOOKING_APPROVED', userId, hubId, {
      userName: testUser.name,
      experienceName: 'Test Experience',
      bookingDate: '2025-02-15',
    }),
  );

  results.push(
    await testNotification('BOOKING_REJECTED', userId, hubId, {
      userName: testUser.name,
      experienceName: 'Test Experience',
      rejectReason: 'Scheduling conflict',
    }),
  );

  results.push(
    await testNotification('BOOKING_CANCELLED_LEARNER', userId, hubId, {
      userName: testUser.name,
      experienceName: 'Test Experience',
      cancellationReason: 'Unable to attend',
      refundInfo: 'Refund will be processed within 5-7 days',
    }),
  );

  results.push(
    await testNotification('BOOKING_CANCELLED_BY_HOST', userId, hubId, {
      userName: testUser.name,
      experienceName: 'Test Experience',
      hubName: testHub?.name || 'Test Hub',
      cancellationReason: 'Event cancelled',
    }),
  );

  // ========================
  // PROPOSAL NOTIFICATIONS
  // ========================
  console.log('\n\n📁 PROPOSAL NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification('PROPOSAL_RECEIVED', userId, hubId, {
      userName: testUser.name,
      expertName: 'Test Expert',
      jobTitle: 'Senior Developer',
      proposedRate: 'MYR 150/hr',
    }),
  );

  results.push(
    await testNotification('PROPOSAL_ACCEPTED', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
      jobTitle: 'Senior Developer',
      contractId: 'contract123',
    }),
  );

  results.push(
    await testNotification('PROPOSAL_REJECTED', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
      jobTitle: 'Senior Developer',
    }),
  );

  results.push(
    await testNotification(
      'PROPOSAL_WITHDRAWN',
      userId,
      hubId,
      {
        userName: testUser.name,
        expertName: 'Test Expert',
        jobTitle: 'Senior Developer',
      },
      ['inApp'],
    ),
  );

  // ========================
  // CONTRACT NOTIFICATIONS
  // ========================
  console.log('\n\n📁 CONTRACT NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification('JOB_OFFER_RECEIVED', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
      contractTitle: 'Web Development Project',
      contractId: 'contract123',
    }),
  );

  results.push(
    await testNotification('JOB_OFFER_ACCEPTED', userId, hubId, {
      userName: testUser.name,
      expertName: 'Test Expert',
      contractTitle: 'Web Development Project',
    }),
  );

  results.push(
    await testNotification('JOB_OFFER_DECLINED', userId, hubId, {
      userName: testUser.name,
      expertName: 'Test Expert',
      contractTitle: 'Web Development Project',
      declineReason: 'Schedule conflict',
    }),
  );

  results.push(
    await testNotification('CONTRACT_CREATED', userId, hubId, {
      userName: testUser.name,
      contractTitle: 'Web Development Project',
      contractId: 'contract123',
    }),
  );

  results.push(
    await testNotification('CONTRACT_CANCELLED_EXPERT', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
      contractTitle: 'Web Development Project',
      cancellationReason: 'Project cancelled',
    }),
  );

  results.push(
    await testNotification('CONTRACT_COMPLETED', userId, hubId, {
      userName: testUser.name,
      contractTitle: 'Web Development Project',
      totalEarnings: 'MYR 5,000',
    }),
  );

  // ========================
  // MILESTONE NOTIFICATIONS
  // ========================
  console.log('\n\n📁 MILESTONE NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification('MILESTONE_SUBMITTED', userId, hubId, {
      userName: testUser.name,
      expertName: 'Test Expert',
      milestoneName: 'Phase 1 Completion',
      contractTitle: 'Web Development Project',
    }),
  );

  results.push(
    await testNotification('MILESTONE_APPROVED', userId, hubId, {
      userName: testUser.name,
      milestoneName: 'Phase 1 Completion',
      amount: 'MYR 1,500',
    }),
  );

  results.push(
    await testNotification('MILESTONE_REJECTED', userId, hubId, {
      userName: testUser.name,
      milestoneName: 'Phase 1 Completion',
      rejectionReason: 'Incomplete deliverables',
    }),
  );

  results.push(
    await testNotification('MILESTONE_FUNDED', userId, hubId, {
      userName: testUser.name,
      milestoneName: 'Phase 1 Completion',
      amount: 'MYR 1,500',
    }),
  );

  // ========================
  // PAYMENT NOTIFICATIONS
  // ========================
  console.log('\n\n📁 PAYMENT NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification('PAYMENT_TRANSFERRED', userId, hubId, {
      userName: testUser.name,
      amount: 'MYR 1,500',
      contractTitle: 'Web Development Project',
    }),
  );

  results.push(
    await testNotification('BOOKING_REFUNDED', userId, hubId, {
      userName: testUser.name,
      amount: 'MYR 200',
      experienceName: 'Test Experience',
      refundReason: 'Booking cancelled by host',
    }),
  );

  results.push(
    await testNotification('WITHDRAWAL_INITIATED', userId, hubId, {
      userName: testUser.name,
      amount: 'MYR 5,000',
      bankAccountLast4: '1234',
      arrivalDate: '2025-02-20',
    }),
  );

  results.push(
    await testNotification('WITHDRAWAL_COMPLETED', userId, hubId, {
      userName: testUser.name,
      amount: 'MYR 5,000',
      bankAccountLast4: '1234',
    }),
  );

  results.push(
    await testNotification('WITHDRAWAL_FAILED', userId, hubId, {
      userName: testUser.name,
      amount: 'MYR 5,000',
      failureMessage: 'Insufficient funds in account',
    }),
  );

  // ========================
  // MEMBER NOTIFICATIONS
  // ========================
  console.log('\n\n📁 MEMBER NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification(
      'HUB_INVITATION_EMAIL',
      userId,
      hubId,
      {
        userEmail: testUser.email,
        hubName: testHub?.name || 'Test Hub',
        roleName: 'Admin',
        invitationUrl: 'https://example.com/join/invite/abc123',
        expiresAt: '2025-03-01',
      },
      ['email'],
    ),
  );

  results.push(
    await testNotification(
      'HUB_MEMBER_JOINED',
      userId,
      hubId,
      {
        userName: testUser.name,
        newMemberName: 'New Member',
        newMemberEmail: 'newmember@example.com',
        hubName: testHub?.name || 'Test Hub',
      },
      ['inApp'],
    ),
  );

  results.push(
    await testNotification('ROLE_CHANGED', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
      newRoleName: 'Manager',
    }),
  );

  results.push(
    await testNotification('MEMBER_REMOVED', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
    }),
  );

  results.push(
    await testNotification('OWNERSHIP_TRANSFERRED', userId, hubId, {
      userName: testUser.name,
      hubName: testHub?.name || 'Test Hub',
      previousOwnerName: 'Previous Owner',
      isNewOwner: true,
    }),
  );

  // ========================
  // TIMELOG NOTIFICATIONS
  // ========================
  console.log('\n\n📁 TIMELOG NOTIFICATIONS');
  console.log('-'.repeat(40));

  results.push(
    await testNotification(
      'TIMELOG_SUBMITTED',
      userId,
      hubId,
      {
        userName: testUser.name,
        expertName: 'Test Expert',
        contractTitle: 'Web Development Project',
        hoursLogged: '8',
        weekEnding: '2025-02-15',
      },
      ['inApp'],
    ),
  );

  results.push(
    await testNotification('TIMELOG_APPROVED', userId, hubId, {
      userName: testUser.name,
      contractTitle: 'Web Development Project',
      hoursApproved: '8',
      amount: 'MYR 1,200',
    }),
  );

  results.push(
    await testNotification('TIMELOG_REJECTED', userId, hubId, {
      userName: testUser.name,
      contractTitle: 'Web Development Project',
      rejectionReason: 'Missing task descriptions',
    }),
  );

  results.push(
    await testNotification('TIMELOG_PAYMENT_RECEIVED', userId, hubId, {
      userName: testUser.name,
      amount: 'MYR 1,200',
      contractTitle: 'Web Development Project',
    }),
  );

  // ========================
  // SUMMARY
  // ========================
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  // Get counts after tests
  const afterCounts = {
    inApp: await InAppNotificationLog.countDocuments({ userId }),
    email: await Email.countDocuments({}),
    whatsApp: await WhatsAppLog.countDocuments({}),
  };

  console.log(`\n📈 New notifications created:`);
  console.log(`   InApp:    ${afterCounts.inApp - beforeCounts.inApp} new`);
  console.log(`   Email:    ${afterCounts.email - beforeCounts.email} new`);
  console.log(`   WhatsApp: ${afterCounts.whatsApp - beforeCounts.whatsApp} new`);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`\n📋 Test Results:`);
  console.log(`   ✅ Passed: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📊 Total:  ${results.length}`);

  if (failCount > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.templateId}: ${r.error}`);
      });
  }

  // Check for missing templates
  const noInApp = results.filter((r) => r.success && r.inApp === false);
  const noEmail = results.filter((r) => r.success && r.email === false);

  if (noInApp.length > 0) {
    console.log('\n⚠️  Templates with no InApp (might be intentional):');
    noInApp.forEach((r) => console.log(`   - ${r.templateId}`));
  }

  if (noEmail.length > 0) {
    console.log('\n⚠️  Templates with no Email (might be intentional):');
    noEmail.forEach((r) => console.log(`   - ${r.templateId}`));
  }

  console.log('\n✅ Notification test complete!\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

// Run tests
runTests().catch(console.error);

/**
 * Seed script for Email logs
 * Run with: npx tsx scripts/seed-emails.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Email, EmailStatus, EmailType } from '../src/core/models/Email';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mereka-dev';
console.log('Using MongoDB URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// Sample user IDs (replace with real ones if needed)
const userIds = [
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(),
];

// Sample SendGrid template IDs
const sampleTemplates: Record<string, string> = {
  WELCOME_EMAIL: 'd-abc123def456789',
  EMAIL_VERIFICATION: 'd-def456ghi789012',
  PASSWORD_RESET: 'd-ghi789jkl012345',
  BOOKING_CONFIRMATION_RECEIPT: 'd-jkl012mno345678',
  BOOKING_CONFIRMATION_ONLINE: 'd-mno345pqr678901',
  BOOKING_REMINDER_ONE_DAY: 'd-pqr678stu901234',
  EXPERIENCE_APPROVED: 'd-stu901vwx234567',
  HUB_INVITATION: 'd-vwx234yza567890',
  PAYMENT_SUCCESS: 'd-yza567bcd890123',
  SUBSCRIPTION_CREATED: 'd-bcd890efg123456',
};

const sampleEmails = [
  // Sent emails
  {
    toEmail: 'john@example.com',
    emailType: EmailType.WELCOME_EMAIL,
    sendGridTemplateId: sampleTemplates.WELCOME_EMAIL,
    data: { userName: 'John Doe', loginUrl: 'https://app.mereka.io/login' },
    status: EmailStatus.DELIVERED,
    providerMessageId: 'sg-msg-001',
    userId: userIds[0],
    sentAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 24) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 23.9) },
    ],
  },
  {
    toEmail: 'jane@example.com',
    emailType: EmailType.EMAIL_VERIFICATION,
    sendGridTemplateId: sampleTemplates.EMAIL_VERIFICATION,
    data: { verificationLink: 'https://app.mereka.io/verify/abc123' },
    status: EmailStatus.OPENED,
    providerMessageId: 'sg-msg-002',
    userId: userIds[1],
    sentAt: new Date(Date.now() - 3600000 * 12), // 12 hours ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 12) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 11.9) },
      { event: 'open', timestamp: new Date(Date.now() - 3600000 * 10) },
    ],
  },
  {
    toEmail: 'bob@example.com',
    emailType: EmailType.PASSWORD_RESET,
    sendGridTemplateId: sampleTemplates.PASSWORD_RESET,
    data: { resetLink: 'https://app.mereka.io/reset/xyz789', expiresIn: '24 hours' },
    status: EmailStatus.CLICKED,
    providerMessageId: 'sg-msg-003',
    userId: userIds[2],
    sentAt: new Date(Date.now() - 3600000 * 6), // 6 hours ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 6) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 5.9) },
      { event: 'open', timestamp: new Date(Date.now() - 3600000 * 5) },
      {
        event: 'click',
        timestamp: new Date(Date.now() - 3600000 * 4.5),
        url: 'https://app.mereka.io/reset/xyz789',
      },
    ],
  },
  // Booking emails
  {
    toEmail: 'learner@example.com',
    emailType: EmailType.BOOKING_CONFIRMATION_RECEIPT,
    sendGridTemplateId: sampleTemplates.BOOKING_CONFIRMATION_RECEIPT,
    data: {
      experienceName: 'Introduction to Pottery',
      bookingDate: '2024-12-15',
      amount: 'RM 150.00',
    },
    status: EmailStatus.DELIVERED,
    providerMessageId: 'sg-msg-004',
    userId: userIds[0],
    sentAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 2) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 1.9) },
    ],
  },
  {
    toEmail: 'host@example.com',
    emailType: EmailType.BOOKING_CONFIRMATION_ONLINE,
    sendGridTemplateId: sampleTemplates.BOOKING_CONFIRMATION_ONLINE,
    data: {
      experienceName: 'Online Yoga Class',
      meetingLink: 'https://zoom.us/j/123456789',
      startTime: '10:00 AM',
    },
    status: EmailStatus.SENT,
    providerMessageId: 'sg-msg-005',
    userId: userIds[1],
    sentAt: new Date(Date.now() - 3600000), // 1 hour ago
    sendGridEvents: [{ event: 'processed', timestamp: new Date(Date.now() - 3600000) }],
  },
  // Failed email
  {
    toEmail: 'invalid@nonexistent-domain-xyz.com',
    emailType: EmailType.WELCOME_EMAIL,
    sendGridTemplateId: sampleTemplates.WELCOME_EMAIL,
    data: { userName: 'Test User' },
    status: EmailStatus.BOUNCED,
    providerMessageId: 'sg-msg-006',
    error: 'Recipient domain does not exist',
    sentAt: new Date(Date.now() - 3600000 * 48), // 2 days ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 48) },
      {
        event: 'bounce',
        timestamp: new Date(Date.now() - 3600000 * 47.9),
        reason: 'Invalid domain',
      },
    ],
  },
  // Pending email
  {
    toEmail: 'pending@example.com',
    emailType: EmailType.BOOKING_REMINDER_ONE_DAY,
    sendGridTemplateId: sampleTemplates.BOOKING_REMINDER_ONE_DAY,
    data: {
      experienceName: 'Photography Workshop',
      bookingDate: 'Tomorrow at 2:00 PM',
    },
    status: EmailStatus.PENDING,
    userId: userIds[2],
  },
  // Experience approval
  {
    toEmail: 'hub-owner@example.com',
    emailType: EmailType.EXPERIENCE_APPROVED,
    sendGridTemplateId: sampleTemplates.EXPERIENCE_APPROVED,
    data: {
      experienceName: 'Cooking Class - Malaysian Cuisine',
      viewUrl: 'https://app.mereka.io/experiences/abc123',
    },
    status: EmailStatus.DELIVERED,
    providerMessageId: 'sg-msg-008',
    userId: userIds[0],
    sentAt: new Date(Date.now() - 3600000 * 72), // 3 days ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 72) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 71.9) },
    ],
  },
  // Hub invitation
  {
    toEmail: 'invited@example.com',
    emailType: EmailType.HUB_INVITATION,
    sendGridTemplateId: sampleTemplates.HUB_INVITATION,
    data: {
      hubName: 'Creative Arts Studio',
      inviterName: 'Sarah',
      acceptUrl: 'https://app.mereka.io/invite/hub123',
    },
    status: EmailStatus.OPENED,
    providerMessageId: 'sg-msg-009',
    sentAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 5) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 4.9) },
      { event: 'open', timestamp: new Date(Date.now() - 3600000 * 3) },
    ],
  },
  // Payment success
  {
    toEmail: 'customer@example.com',
    emailType: EmailType.PAYMENT_SUCCESS,
    sendGridTemplateId: sampleTemplates.PAYMENT_SUCCESS,
    data: {
      amount: 'RM 250.00',
      description: 'Booking for Art Workshop',
      receiptUrl: 'https://app.mereka.io/receipts/pay123',
    },
    status: EmailStatus.DELIVERED,
    providerMessageId: 'sg-msg-010',
    userId: userIds[1],
    sentAt: new Date(Date.now() - 3600000 * 8), // 8 hours ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 8) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 7.9) },
    ],
  },
  // Failed email
  {
    toEmail: 'test@example.com',
    emailType: EmailType.SUBSCRIPTION_CREATED,
    sendGridTemplateId: sampleTemplates.SUBSCRIPTION_CREATED,
    data: { planName: 'Scale Plan', amount: 'RM 99/month' },
    status: EmailStatus.FAILED,
    error: 'SendGrid API rate limit exceeded',
    sentAt: new Date(Date.now() - 3600000 * 10), // 10 hours ago
  },
  // More variety
  {
    toEmail: 'alice@example.com',
    emailType: EmailType.BOOKING_CONFIRMATION_RECEIPT,
    sendGridTemplateId: sampleTemplates.BOOKING_CONFIRMATION_RECEIPT,
    data: { experienceName: 'Baking Class', amount: 'RM 120.00' },
    status: EmailStatus.DELIVERED,
    providerMessageId: 'sg-msg-012',
    userId: userIds[2],
    sentAt: new Date(Date.now() - 3600000 * 36), // 1.5 days ago
    sendGridEvents: [
      { event: 'processed', timestamp: new Date(Date.now() - 3600000 * 36) },
      { event: 'delivered', timestamp: new Date(Date.now() - 3600000 * 35.9) },
    ],
  },
];

async function seedEmails() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing emails (optional - comment out to keep existing)
    console.log('Clearing existing emails...');
    await Email.deleteMany({});

    console.log('Inserting sample emails...');
    const result = await Email.insertMany(sampleEmails);
    console.log(`Successfully inserted ${result.length} emails`);

    // Show summary
    const statusCounts = await Email.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    console.log('\nEmail status summary:');
    statusCounts.forEach((s) => console.log(`  ${s._id}: ${s.count}`));

    const typeCounts = await Email.aggregate([
      { $group: { _id: '$emailType', count: { $sum: 1 } } },
    ]);
    console.log('\nEmail type summary:');
    typeCounts.forEach((t) => console.log(`  ${t._id}: ${t.count}`));
  } catch (error) {
    console.error('Error seeding emails:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedEmails();

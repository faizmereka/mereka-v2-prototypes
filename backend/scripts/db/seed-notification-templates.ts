#!/usr/bin/env tsx

import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { EmailTemplate, EmailTemplateCategory } from '../../src/core/models/EmailTemplate';
import { NotificationScope, TargetUserType } from '../../src/core/models/enums/NotificationEnums';
import {
  InAppNotificationTemplate,
  NotificationCategory,
} from '../../src/core/models/InAppNotificationTemplate';
import { WhatsAppTemplate, WhatsAppTemplateCategory } from '../../src/core/models/WhatsAppTemplate';

/**
 * Seed script for notification templates
 *
 * Seeds all three template collections:
 * - InAppNotificationTemplate (inAppNotificationTemplates)
 * - EmailTemplate (emailTemplates)
 * - WhatsAppTemplate (whatsAppTemplates)
 *
 * Run: npx tsx scripts/db/seed-notification-templates.ts
 */

interface TemplateDefinition {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category:
    | 'system'
    | 'bookings'
    | 'jobs'
    | 'payments'
    | 'members'
    | 'experiences'
    | 'promotions'
    | 'chats';
  channels: ('email' | 'inApp' | 'whatsApp')[];
  bodyPreview: string;
  sendGridTemplateId?: string;
  whatsAppTemplateName?: string;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    url?: string;
    actionType?: string;
  }>;
  /**
   * Notification scope
   * - user: Personal notifications (password reset, welcome, account updates)
   * - hub: Hub-related notifications (bookings, payments, members, jobs)
   */
  scope: 'user' | 'hub';
  /**
   * Target user types who should receive this notification
   * Empty array = all user types (backward compatible)
   */
  targetUserTypes: ('learner' | 'expert' | 'hub_owner' | 'hub_admin' | 'hub_collaborator')[];
}

/**
 * Complete list of notification templates
 * Mapped from v1 + new v2 requirements
 */
const TEMPLATES: TemplateDefinition[] = [
  // ============================================
  // SYSTEM TEMPLATES (7)
  // User-scoped: personal notifications sent to individual users
  // ============================================
  {
    templateId: 'WELCOME_USER',
    name: 'Welcome User',
    title: 'Welcome to Mereka',
    description: 'Sent when a new user registers',
    category: 'system',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Hi {{userName}}, welcome to Mereka! Start exploring experiences and connect with experts.',
    sendGridTemplateId: 'd-welcome-user',
    actions: [
      {
        label: 'Explore Experiences',
        type: 'primary',
        url: '/experiences',
        actionType: 'navigate',
      },
    ],
    scope: 'user',
    targetUserTypes: [], // All user types
  },
  {
    templateId: 'EMAIL_VERIFICATION',
    name: 'Email Verification',
    title: 'Verify Your Email',
    description: 'Email verification link sent during registration',
    category: 'system',
    channels: ['email'],
    bodyPreview: 'Please verify your email address by clicking the link: {{verificationLink}}',
    sendGridTemplateId: 'd-email-verification',
    scope: 'user',
    targetUserTypes: [], // All user types
  },
  {
    templateId: 'OTP_LOGIN_CODE',
    name: 'OTP Login Code',
    title: 'Login Code',
    description: 'One-time password for passwordless login',
    category: 'system',
    channels: ['email', 'whatsApp'],
    bodyPreview: 'Your login code is {{otpCode}}. Valid for {{expiryMinutes}} minutes.',
    sendGridTemplateId: 'd-otp-login-code',
    whatsAppTemplateName: 'otp_login_code',
    scope: 'user',
    targetUserTypes: [], // All user types
  },
  {
    templateId: 'LOGIN_SUCCESS',
    name: 'Login Success',
    title: 'Login Notification',
    description: 'Notification when user logs in from a new device',
    category: 'system',
    channels: ['inApp'],
    bodyPreview: 'New login detected from {{deviceInfo}} at {{loginTime}}.',
    scope: 'user',
    targetUserTypes: [], // All user types
  },
  {
    templateId: 'PASSWORD_RESET_LINK',
    name: 'Password Reset Link',
    title: 'Reset Your Password',
    description: 'Password reset link sent when user requests password change',
    category: 'system',
    channels: ['email'],
    bodyPreview:
      'Click here to reset your password: {{resetLink}}. This link expires in {{expiryMinutes}} minutes.',
    sendGridTemplateId: 'd-password-reset-link',
    scope: 'user',
    targetUserTypes: [], // All user types
  },
  {
    templateId: 'PASSWORD_RESET_SUCCESS',
    name: 'Password Reset Success',
    title: 'Password Changed',
    description: 'Confirmation that password was successfully reset',
    category: 'system',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
    sendGridTemplateId: 'd-password-reset-success',
    scope: 'user',
    targetUserTypes: [], // All user types
  },
  {
    templateId: 'PASSWORD_CHANGED',
    name: 'Password Changed',
    title: 'Password Updated',
    description: 'Confirmation that user changed their password',
    category: 'system',
    channels: ['email', 'inApp'],
    bodyPreview: 'Your password was changed successfully on {{changeDate}}.',
    sendGridTemplateId: 'd-password-changed',
    scope: 'user',
    targetUserTypes: [], // All user types
  },

  // ============================================
  // BOOKING TEMPLATES (12)
  // Hub-scoped: bookings are always related to a hub
  // ============================================
  {
    templateId: 'BOOKING_CONFIRMED_LEARNER',
    name: 'Booking Confirmed (Learner)',
    title: 'Booking Confirmed',
    description: 'Sent to learner when booking is confirmed',
    category: 'bookings',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Your booking for "{{experienceName}}" with {{expertName}} on {{bookingDate}} at {{bookingTime}} is confirmed!',
    sendGridTemplateId: 'd-booking-confirmed-learner',
    whatsAppTemplateName: 'booking_confirmed_learner',
    actions: [
      {
        label: 'View Booking',
        type: 'primary',
        url: '/bookings/{{bookingId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_CONFIRMED_EXPERT',
    name: 'Booking Confirmed (Expert)',
    title: 'New Booking Received',
    description: 'Sent to expert when they receive a new booking',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      'You have a new booking for "{{experienceName}}" from {{learnerName}} on {{bookingDate}} at {{bookingTime}}.',
    sendGridTemplateId: 'd-booking-confirmed-expert',
    actions: [
      {
        label: 'View Booking',
        type: 'primary',
        url: '/hub/bookings/{{bookingId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'BOOKING_APPROVED',
    name: 'Booking Approved',
    title: 'Booking Approved',
    description: 'Sent to learner when hub approves pending booking',
    category: 'bookings',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Great news! Your booking for "{{experienceName}}" has been approved by {{hubName}}.',
    sendGridTemplateId: 'd-booking-approved',
    whatsAppTemplateName: 'booking_approved',
    actions: [
      {
        label: 'View Details',
        type: 'primary',
        url: '/bookings/{{bookingId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_REJECTED',
    name: 'Booking Rejected',
    title: 'Booking Not Approved',
    description: 'Sent to learner when hub rejects pending booking',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Unfortunately, your booking for "{{experienceName}}" could not be approved. {{rejectReason}}',
    sendGridTemplateId: 'd-booking-rejected',
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_CANCELLED_LEARNER',
    name: 'Booking Cancelled (Learner)',
    title: 'Booking Cancelled',
    description: 'Sent to learner when their booking is cancelled',
    category: 'bookings',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Your booking for "{{experienceName}}" on {{bookingDate}} has been cancelled. {{refundInfo}}',
    sendGridTemplateId: 'd-booking-cancelled-learner',
    whatsAppTemplateName: 'booking_cancelled_learner',
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_CANCELLED_HOST',
    name: 'Booking Cancelled (Host Notification)',
    title: 'Booking Cancelled by Learner',
    description: 'Sent to host when learner cancels booking',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{learnerName}} has cancelled their booking for "{{experienceName}}" on {{bookingDate}}.',
    sendGridTemplateId: 'd-booking-cancelled-host',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'BOOKING_CANCELLED_BY_HOST',
    name: 'Booking Cancelled by Host',
    title: 'Booking Cancelled by Host',
    description: 'Sent to learner when host cancels the booking',
    category: 'bookings',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      '{{hubName}} has cancelled your booking for "{{experienceName}}" on {{bookingDate}}. {{cancellationReason}} {{refundInfo}}',
    sendGridTemplateId: 'd-booking-cancelled-by-host',
    whatsAppTemplateName: 'booking_cancelled_by_host',
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_COMPLETED_LEARNER',
    name: 'Booking Completed (Learner)',
    title: 'Experience Completed',
    description: 'Sent to learner after experience is completed',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Hope you enjoyed "{{experienceName}}" with {{expertName}}! Please leave a review.',
    sendGridTemplateId: 'd-booking-completed-learner',
    actions: [
      {
        label: 'Leave Review',
        type: 'primary',
        url: '/bookings/{{bookingId}}/review',
        actionType: 'navigate',
      },
    ],
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_COMPLETED_EXPERT',
    name: 'Booking Completed (Expert)',
    title: 'Session Completed',
    description: 'Sent to expert after experience is completed',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview: 'Your session for "{{experienceName}}" with {{learnerName}} has been completed.',
    sendGridTemplateId: 'd-booking-completed-expert',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'BOOKING_REMINDER',
    name: 'Booking Reminder',
    title: 'Upcoming Booking Reminder',
    description: 'Reminder sent before scheduled booking',
    category: 'bookings',
    channels: ['email', 'whatsApp'],
    bodyPreview:
      'Reminder: Your booking for "{{experienceName}}" is in {{reminderTime}}. {{joinLink}}',
    sendGridTemplateId: 'd-booking-reminder',
    whatsAppTemplateName: 'booking_reminder',
    scope: 'user', // Users can control their own reminder preference
    targetUserTypes: ['learner', 'expert'],
  },
  {
    templateId: 'MANUAL_BOOKING_CREATED_LEARNER',
    name: 'Manual Booking Created (Learner)',
    title: 'Booking Created',
    description: 'Sent to learner when hub creates manual booking',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{hubName}} has created a booking for you: "{{experienceName}}" on {{bookingDate}} at {{bookingTime}}.',
    sendGridTemplateId: 'd-manual-booking-learner',
    actions: [
      {
        label: 'View Booking',
        type: 'primary',
        url: '/bookings/{{bookingId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'MANUAL_BOOKING_CREATED_EXPERT',
    name: 'Manual Booking Created (Expert)',
    title: 'New Booking Assigned',
    description: 'Sent to expert when manual booking is created',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      'A booking for "{{experienceName}}" with {{learnerName}} on {{bookingDate}} has been assigned to you.',
    sendGridTemplateId: 'd-manual-booking-expert',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },

  // ============================================
  // PROPOSAL TEMPLATES (4)
  // Hub-scoped: proposals are always related to hub jobs
  // ============================================
  {
    templateId: 'PROPOSAL_RECEIVED',
    name: 'Proposal Received',
    title: 'New Proposal',
    description: 'Sent to job poster when they receive a proposal',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{expertName}} has submitted a proposal for "{{jobTitle}}". Proposed rate: {{proposedRate}}.',
    sendGridTemplateId: 'd-proposal-received',
    actions: [
      {
        label: 'View Proposal',
        type: 'primary',
        url: '/hub/jobs/{{jobId}}/proposals/{{proposalId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'PROPOSAL_WITHDRAWN',
    name: 'Proposal Withdrawn',
    title: 'Proposal Withdrawn',
    description: 'Sent to job poster when expert withdraws proposal',
    category: 'jobs',
    channels: ['inApp'],
    bodyPreview: '{{expertName}} has withdrawn their proposal for "{{jobTitle}}".',
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'PROPOSAL_ACCEPTED',
    name: 'Proposal Accepted',
    title: 'Proposal Accepted',
    description: 'Sent to expert when their proposal is accepted',
    category: 'jobs',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Congratulations! Your proposal for "{{jobTitle}}" has been accepted by {{hubName}}.',
    sendGridTemplateId: 'd-proposal-accepted',
    whatsAppTemplateName: 'proposal_accepted',
    actions: [
      {
        label: 'View Contract',
        type: 'primary',
        url: '/contracts/{{contractId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'PROPOSAL_REJECTED',
    name: 'Proposal Rejected',
    title: 'Proposal Not Selected',
    description: 'Sent to expert when their proposal is rejected',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Unfortunately, your proposal for "{{jobTitle}}" was not selected. {{feedbackMessage}}',
    sendGridTemplateId: 'd-proposal-rejected',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },

  // ============================================
  // JOB & CONTRACT TEMPLATES (10)
  // Hub-scoped: contracts are between hub and expert
  // ============================================
  {
    templateId: 'JOB_OFFER_RECEIVED',
    name: 'Job Offer Received',
    title: 'New Job Offer',
    description: 'Sent to expert when they receive a job offer',
    category: 'jobs',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      '{{hubName}} has sent you a job offer for "{{contractTitle}}". Review and respond to the offer.',
    sendGridTemplateId: 'd-job-offer-received',
    whatsAppTemplateName: 'job_offer_received',
    actions: [
      {
        label: 'View Offer',
        type: 'primary',
        url: '/contracts/{{contractId}}',
        actionType: 'navigate',
      },
      { label: 'Decline', type: 'secondary', actionType: 'decline' },
    ],
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'JOB_OFFER_ACCEPTED',
    name: 'Job Offer Accepted',
    title: 'Offer Accepted',
    description: 'Sent to client when expert accepts job offer',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{expertName}} has accepted your job offer for "{{contractTitle}}". The contract is now active.',
    sendGridTemplateId: 'd-job-offer-accepted',
    actions: [
      {
        label: 'View Contract',
        type: 'primary',
        url: '/hub/contracts/{{contractId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'JOB_OFFER_DECLINED',
    name: 'Job Offer Declined',
    title: 'Offer Declined',
    description: 'Sent to client when expert declines job offer',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{expertName}} has declined your job offer for "{{contractTitle}}". {{declineReason}}',
    sendGridTemplateId: 'd-job-offer-declined',
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'CONTRACT_CREATED',
    name: 'Contract Created',
    title: 'Contract Created',
    description: 'Sent when a new contract is created',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview: 'A new contract "{{contractTitle}}" has been created with {{partyName}}.',
    sendGridTemplateId: 'd-contract-created',
    actions: [
      {
        label: 'View Contract',
        type: 'primary',
        url: '/contracts/{{contractId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'CONTRACT_CANCELLED_EXPERT',
    name: 'Contract Cancelled (Expert)',
    title: 'Contract Cancelled',
    description: 'Sent to expert when contract is cancelled',
    category: 'jobs',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      '{{hubName}} has cancelled the contract "{{contractTitle}}". {{cancellationReason}}',
    sendGridTemplateId: 'd-contract-cancelled-expert',
    whatsAppTemplateName: 'contract_cancelled',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'CONTRACT_CANCELLED_CLIENT',
    name: 'Contract Cancelled (Client)',
    title: 'Contract Cancelled',
    description: 'Sent to client when expert cancels contract',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{expertName}} has cancelled the contract "{{contractTitle}}". {{cancellationReason}}',
    sendGridTemplateId: 'd-contract-cancelled-client',
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'CONTRACT_PAUSED',
    name: 'Contract Paused',
    title: 'Contract Paused',
    description: 'Sent when contract is temporarily paused',
    category: 'jobs',
    channels: ['inApp'],
    bodyPreview: 'The contract "{{contractTitle}}" has been paused. {{pauseReason}}',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'CONTRACT_RESUMED',
    name: 'Contract Resumed',
    title: 'Contract Resumed',
    description: 'Sent when paused contract is resumed',
    category: 'jobs',
    channels: ['inApp'],
    bodyPreview: 'The contract "{{contractTitle}}" has been resumed and is now active.',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'TERMS_UPDATE_REQUESTED',
    name: 'Terms Update Requested',
    title: 'Contract Terms Update',
    description: 'Sent when party requests contract terms change',
    category: 'jobs',
    channels: ['inApp'],
    bodyPreview:
      '{{requestedBy}} has requested changes to the contract "{{contractTitle}}". Please review the proposed terms.',
    actions: [
      {
        label: 'Review Changes',
        type: 'primary',
        url: '/contracts/{{contractId}}/terms',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'TERMS_UPDATE_APPLIED',
    name: 'Terms Update Applied',
    title: 'Contract Terms Updated',
    description: 'Sent when contract terms are updated',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      'The terms for contract "{{contractTitle}}" have been updated and are now in effect.',
    sendGridTemplateId: 'd-terms-update-applied',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },

  // ============================================
  // TIMELOG & MILESTONE TEMPLATES (8)
  // Hub-scoped: timelogs and milestones are part of contracts
  // ============================================
  {
    templateId: 'TIMELOG_SUBMITTED',
    name: 'Timelog Submitted',
    title: 'Timelog for Review',
    description: 'Sent to client when expert submits timelog',
    category: 'jobs',
    channels: ['inApp'],
    bodyPreview:
      '{{expertName}} has submitted a timelog of {{hoursWorked}} hours for "{{contractTitle}}". Please review and approve.',
    actions: [
      {
        label: 'Review Timelog',
        type: 'primary',
        url: '/hub/contracts/{{contractId}}/timelogs',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'TIMELOG_APPROVED',
    name: 'Timelog Approved',
    title: 'Timelog Approved',
    description: 'Sent to expert when timelog is approved',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{hubName}} approved your timelog of {{hoursWorked}} hours. Payment will be processed on the next payout cycle.',
    sendGridTemplateId: 'd-timelog-approved',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'TIMELOG_REJECTED',
    name: 'Timelog Rejected',
    title: 'Timelog Rejected',
    description: 'Sent to expert when timelog is rejected',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview: '{{hubName}} has rejected your timelog of {{hoursWorked}} hours. {{rejectReason}}',
    sendGridTemplateId: 'd-timelog-rejected',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'TIMELOG_PAYMENT_RECEIVED',
    name: 'Timelog Payment Received',
    title: 'Payment Received',
    description: 'Sent to expert when timelog payment is processed',
    category: 'payments',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Payment of {{currency}}{{amount}} for {{hoursWorked}} hours on "{{contractTitle}}" has been processed.',
    sendGridTemplateId: 'd-timelog-payment-received',
    whatsAppTemplateName: 'timelog_payment_received',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'MILESTONE_SUBMITTED',
    name: 'Milestone Submitted',
    title: 'Milestone Work Submitted',
    description: 'Sent to client when expert submits milestone work',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{expertName}} has submitted work for milestone "{{milestoneName}}". Please review and approve.',
    sendGridTemplateId: 'd-milestone-submitted',
    actions: [
      {
        label: 'Review Work',
        type: 'primary',
        url: '/hub/contracts/{{contractId}}/milestones/{{milestoneId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'MILESTONE_APPROVED',
    name: 'Milestone Approved',
    title: 'Milestone Approved',
    description: 'Sent to expert when milestone is approved',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{hubName}} approved your milestone "{{milestoneName}}". {{currency}}{{amount}} will be released to your account.',
    sendGridTemplateId: 'd-milestone-approved',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'MILESTONE_REJECTED',
    name: 'Milestone Rejected',
    title: 'Milestone Changes Requested',
    description: 'Sent to expert when milestone needs revision',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{hubName}} has requested changes for milestone "{{milestoneName}}". {{feedbackMessage}}',
    sendGridTemplateId: 'd-milestone-rejected',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'MILESTONE_FUNDED',
    name: 'Milestone Funded',
    title: 'Milestone Funded',
    description: 'Sent to expert when client funds a milestone',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{hubName}} has funded milestone "{{milestoneName}}" with {{currency}}{{amount}}. You can now start working on it.',
    sendGridTemplateId: 'd-milestone-funded',
    actions: [
      {
        label: 'View Milestone',
        type: 'primary',
        url: '/contracts/{{contractId}}/milestones/{{milestoneId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['expert'],
  },

  // ============================================
  // PAYMENT TEMPLATES (6)
  // Hub-scoped: payments are related to hub transactions
  // ============================================
  {
    templateId: 'PAYMENT_TRANSFERRED',
    name: 'Payment Transferred',
    title: 'Payment Received',
    description: 'Sent when payment is transferred to expert',
    category: 'payments',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Payment of {{currency}}{{amount}} has been transferred to your account for "{{description}}".',
    sendGridTemplateId: 'd-payment-transferred',
    whatsAppTemplateName: 'payment_transferred',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'BOOKING_REFUNDED',
    name: 'Booking Refunded',
    title: 'Refund Processed',
    description: 'Sent when booking payment is refunded',
    category: 'payments',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Your refund of {{currency}}{{amount}} for "{{experienceName}}" has been processed. {{refundDetails}}',
    sendGridTemplateId: 'd-booking-refunded',
    whatsAppTemplateName: 'booking_refunded',
    scope: 'user', // Learner can control their own notification preference
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'WITHDRAWAL_INITIATED',
    name: 'Withdrawal Initiated',
    title: 'Withdrawal Request',
    description: 'Sent when user initiates withdrawal',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your withdrawal request for {{currency}}{{amount}} has been received and is being processed.',
    sendGridTemplateId: 'd-withdrawal-initiated',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner'],
  },
  {
    templateId: 'WITHDRAWAL_CANCELLED',
    name: 'Withdrawal Cancelled',
    title: 'Withdrawal Cancelled',
    description: 'Sent when withdrawal request is cancelled',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your withdrawal request for {{currency}}{{amount}} has been cancelled. {{cancellationReason}}',
    sendGridTemplateId: 'd-withdrawal-cancelled',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner'],
  },
  {
    templateId: 'WITHDRAWAL_COMPLETED',
    name: 'Withdrawal Completed',
    title: 'Withdrawal Complete',
    description: 'Sent when withdrawal is successfully completed',
    category: 'payments',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Your withdrawal of {{currency}}{{amount}} has been completed and should arrive in your account within {{estimatedDays}} business days.',
    sendGridTemplateId: 'd-withdrawal-completed',
    whatsAppTemplateName: 'withdrawal_completed',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner'],
  },
  {
    templateId: 'WITHDRAWAL_FAILED',
    name: 'Withdrawal Failed',
    title: 'Withdrawal Failed',
    description: 'Sent when withdrawal fails',
    category: 'payments',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview:
      'Your withdrawal of {{currency}}{{amount}} has failed. {{failureReason}} Please update your payout details and try again.',
    sendGridTemplateId: 'd-withdrawal-failed',
    whatsAppTemplateName: 'withdrawal_failed',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner'],
  },

  // ============================================
  // MEMBER TEMPLATES (6)
  // Hub-scoped: member management is hub-specific
  // ============================================
  {
    templateId: 'HUB_INVITATION_EMAIL',
    name: 'Hub Invitation',
    title: 'Hub Invitation',
    description: 'Email invitation to join a hub',
    category: 'members',
    channels: ['email'],
    bodyPreview:
      'You have been invited to join {{hubName}} as {{roleName}}. Click to accept: {{invitationLink}}',
    sendGridTemplateId: 'd-hub-invitation',
    scope: 'hub',
    targetUserTypes: [], // Can invite anyone
  },
  {
    templateId: 'HUB_MEMBER_JOINED',
    name: 'Hub Member Joined',
    title: 'New Team Member',
    description: 'Sent to hub admins when new member joins',
    category: 'members',
    channels: ['inApp'],
    bodyPreview: '{{memberName}} has joined {{hubName}} as {{roleName}}.',
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'INVITATION_CANCELLED',
    name: 'Invitation Cancelled',
    title: 'Invitation Cancelled',
    description: 'Sent when hub cancels pending invitation',
    category: 'members',
    channels: ['email'],
    bodyPreview: 'The invitation to join {{hubName}} has been cancelled.',
    sendGridTemplateId: 'd-invitation-cancelled',
    scope: 'hub',
    targetUserTypes: [], // Sent to invitee
  },
  {
    templateId: 'ROLE_CHANGED',
    name: 'Role Changed',
    title: 'Role Updated',
    description: 'Sent when member role is changed',
    category: 'members',
    channels: ['email', 'inApp'],
    bodyPreview: 'Your role in {{hubName}} has been changed from {{oldRole}} to {{newRole}}.',
    sendGridTemplateId: 'd-role-changed',
    scope: 'hub',
    targetUserTypes: ['hub_admin', 'hub_collaborator'],
  },
  {
    templateId: 'MEMBER_REMOVED',
    name: 'Member Removed',
    title: 'Removed from Hub',
    description: 'Sent when member is removed from hub',
    category: 'members',
    channels: ['email', 'inApp'],
    bodyPreview: 'You have been removed from {{hubName}}. {{removalReason}}',
    sendGridTemplateId: 'd-member-removed',
    scope: 'hub',
    targetUserTypes: ['hub_admin', 'hub_collaborator', 'expert'],
  },
  {
    templateId: 'OWNERSHIP_TRANSFERRED',
    name: 'Ownership Transferred',
    title: 'Hub Ownership Transfer',
    description: 'Sent when hub ownership is transferred',
    category: 'members',
    channels: ['email', 'inApp'],
    bodyPreview: 'Hub ownership for {{hubName}} has been transferred. {{transferDetails}}',
    sendGridTemplateId: 'd-ownership-transferred',
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },

  // ============================================
  // ADDITIONAL CONTRACT NOTIFICATIONS (from existing hubContractNotification)
  // Hub-scoped: contract-related notifications
  // ============================================
  {
    templateId: 'MILESTONE_AUTO_RELEASED',
    name: 'Milestone Auto-Released',
    title: 'Milestone Auto-Released',
    description: 'Sent when milestone is automatically released after 7 days',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Milestone "{{milestoneName}}" has been automatically released after {{autoReleaseDays}} days. {{currency}}{{amount}} will be transferred.',
    sendGridTemplateId: 'd-milestone-auto-released',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'CONTRACT_COMPLETED',
    name: 'Contract Completed',
    title: 'Contract Completed',
    description: 'Sent when contract is marked as completed',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      'The contract "{{contractTitle}}" has been successfully completed. {{completionSummary}}',
    sendGridTemplateId: 'd-contract-completed',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },
  {
    templateId: 'WEEKLY_PAYOUT_PROCESSED',
    name: 'Weekly Payout Processed',
    title: 'Weekly Payout',
    description: 'Sent when weekly payout is processed',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your weekly payout of {{currency}}{{amount}} for {{hoursWorked}} hours on "{{contractTitle}}" has been processed.',
    sendGridTemplateId: 'd-weekly-payout-processed',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },
  {
    templateId: 'WEEKLY_PAYOUT_FAILED',
    name: 'Weekly Payout Failed',
    title: 'Payment Failed',
    description: 'Sent when weekly payout fails',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Payment of {{currency}}{{amount}} for "{{contractTitle}}" failed. {{errorMessage}} We will retry automatically.',
    sendGridTemplateId: 'd-weekly-payout-failed',
    scope: 'hub',
    targetUserTypes: ['expert'],
  },

  // ============================================
  // REVIEW & FEEDBACK TEMPLATES (5)
  // User-scoped: learners control their own review reminders
  // ============================================
  {
    templateId: 'REVIEW_REQUEST_LEARNER',
    name: 'Review Request (Learner)',
    title: 'Share Your Experience',
    description: 'Sent to learner after booking completion to request review',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      'How was your experience with "{{experienceName}}"? Your feedback helps others make informed decisions.',
    sendGridTemplateId: 'd-review-request-learner',
    actions: [
      {
        label: 'Leave Review',
        type: 'primary',
        url: '/bookings/{{bookingId}}/review',
        actionType: 'navigate',
      },
    ],
    scope: 'user',
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'REVIEW_REMINDER_LEARNER',
    name: 'Review Reminder (Learner)',
    title: 'Reminder: Share Your Feedback',
    description: 'Follow-up reminder to leave review (1 week after)',
    category: 'bookings',
    channels: ['email'],
    bodyPreview:
      'We noticed you haven\'t reviewed your experience with "{{experienceName}}" yet. Your feedback matters!',
    sendGridTemplateId: 'd-review-reminder-learner',
    scope: 'user',
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'NEW_REVIEW_RECEIVED',
    name: 'New Review Received',
    title: 'New Review',
    description: 'Sent to hub when they receive a new review',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{learnerName}} left a {{rating}}-star review for "{{experienceName}}". {{reviewPreview}}',
    sendGridTemplateId: 'd-new-review-received',
    actions: [
      {
        label: 'View Review',
        type: 'primary',
        url: '/hub/reviews/{{reviewId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin', 'expert'],
  },
  {
    templateId: 'NEW_CONTRACT_REVIEW_RECEIVED',
    name: 'New Contract Review Received',
    title: 'New Contract Review',
    description: 'Sent to hub when they receive a contract review from client or expert',
    category: 'jobs',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{reviewerHubName}} left a {{rating}}-star review for contract "{{contractTitle}}". {{reviewPreview}}',
    sendGridTemplateId: 'd-new-contract-review-received',
    actions: [
      {
        label: 'View Review',
        type: 'primary',
        url: '/hub/jobs/contracts/{{contractId}}?tab=reviews',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin', 'expert'],
  },

  // ============================================
  // EXPERIENCE STATUS TEMPLATES (4)
  // Hub-scoped: experience management notifications
  // ============================================
  {
    templateId: 'EXPERIENCE_SUBMITTED',
    name: 'Experience Submitted',
    title: 'Experience Under Review',
    description: 'Sent when hub submits experience for review',
    category: 'experiences',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your experience "{{experienceName}}" has been submitted and is under review. We\'ll notify you once approved.',
    sendGridTemplateId: 'd-experience-submitted',
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'EXPERIENCE_APPROVED',
    name: 'Experience Approved',
    title: 'Experience Approved',
    description: 'Sent when experience is approved and live',
    category: 'experiences',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Great news! Your experience "{{experienceName}}" has been approved and is now live.',
    sendGridTemplateId: 'd-experience-approved',
    actions: [
      {
        label: 'View Experience',
        type: 'primary',
        url: '/hub/experiences/{{experienceId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'EXPERIENCE_REJECTED',
    name: 'Experience Rejected',
    title: 'Experience Not Approved',
    description: 'Sent when experience is rejected with feedback',
    category: 'experiences',
    channels: ['email', 'inApp'],
    bodyPreview: 'Your experience "{{experienceName}}" requires some changes. {{rejectionReason}}',
    sendGridTemplateId: 'd-experience-rejected',
    actions: [
      {
        label: 'Edit Experience',
        type: 'primary',
        url: '/hub/experiences/{{experienceId}}/edit',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },
  {
    templateId: 'EXPERIENCE_EXPIRING',
    name: 'Experience Expiring',
    title: 'Experience Expiring Soon',
    description: 'Sent when experience is about to expire',
    category: 'experiences',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your experience "{{experienceName}}" will expire on {{expiryDate}}. Renew it to keep it active.',
    sendGridTemplateId: 'd-experience-expiring',
    actions: [
      {
        label: 'Renew Experience',
        type: 'primary',
        url: '/hub/experiences/{{experienceId}}/renew',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },

  // ============================================
  // CHAT & MESSAGING TEMPLATES (3)
  // User-scoped: users control their chat notifications
  // ============================================
  {
    templateId: 'NEW_CHAT_MESSAGE',
    name: 'New Chat Message',
    title: 'New Message',
    description: 'Sent when user receives a new chat message',
    category: 'chats',
    channels: ['inApp'],
    bodyPreview: '{{senderName}}: {{messagePreview}}',
    actions: [
      {
        label: 'View Chat',
        type: 'primary',
        url: '/messages/{{chatId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'user',
    targetUserTypes: [],
  },
  {
    templateId: 'UNREAD_MESSAGES_DIGEST',
    name: 'Unread Messages Digest',
    title: 'You Have Unread Messages',
    description: 'Daily digest of unread messages',
    category: 'chats',
    channels: ['email'],
    bodyPreview: 'You have {{unreadCount}} unread messages. Check your inbox to stay connected.',
    sendGridTemplateId: 'd-unread-messages-digest',
    scope: 'user',
    targetUserTypes: [],
  },
  {
    templateId: 'NEW_INQUIRY_RECEIVED',
    name: 'New Inquiry Received',
    title: 'New Booking Inquiry',
    description: 'Sent to hub when learner sends booking inquiry',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      '{{learnerName}} has sent an inquiry about "{{experienceName}}". Respond to convert this lead.',
    sendGridTemplateId: 'd-new-inquiry-received',
    actions: [
      {
        label: 'View Inquiry',
        type: 'primary',
        url: '/hub/inquiries/{{inquiryId}}',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner', 'hub_admin'],
  },

  // ============================================
  // SUBSCRIPTION & BILLING TEMPLATES (4)
  // Hub-scoped: subscription management for hubs
  // ============================================
  {
    templateId: 'SUBSCRIPTION_RENEWED',
    name: 'Subscription Renewed',
    title: 'Subscription Renewed',
    description: 'Sent when subscription is successfully renewed',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your {{planName}} subscription has been renewed. Next billing date: {{nextBillingDate}}.',
    sendGridTemplateId: 'd-subscription-renewed',
    scope: 'hub',
    targetUserTypes: ['hub_owner'],
  },
  {
    templateId: 'SUBSCRIPTION_PAYMENT_FAILED',
    name: 'Subscription Payment Failed',
    title: 'Payment Failed',
    description: 'Sent when subscription payment fails',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      "We couldn't process your subscription payment. Please update your payment method to avoid service interruption.",
    sendGridTemplateId: 'd-subscription-payment-failed',
    actions: [
      {
        label: 'Update Payment',
        type: 'primary',
        url: '/hub/settings/billing',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner'],
  },
  {
    templateId: 'SUBSCRIPTION_CANCELLED',
    name: 'Subscription Cancelled',
    title: 'Subscription Cancelled',
    description: 'Sent when subscription is cancelled',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your subscription has been cancelled. You can continue using {{planName}} features until {{endDate}}.',
    sendGridTemplateId: 'd-subscription-cancelled',
    scope: 'hub',
    targetUserTypes: ['hub_owner'],
  },
  {
    templateId: 'SUBSCRIPTION_EXPIRING',
    name: 'Subscription Expiring',
    title: 'Subscription Expiring Soon',
    description: 'Sent when subscription is about to expire',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Your {{planName}} subscription will expire on {{expiryDate}}. Renew now to keep your hub active.',
    sendGridTemplateId: 'd-subscription-expiring',
    actions: [
      {
        label: 'Renew Subscription',
        type: 'primary',
        url: '/hub/settings/billing',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner'],
  },

  // ============================================
  // ADDITIONAL BOOKING REMINDERS (3)
  // More granular reminders like v1
  // ============================================
  {
    templateId: 'BOOKING_REMINDER_1_HOUR',
    name: 'Booking Reminder (1 Hour)',
    title: 'Your Session Starts Soon',
    description: 'Reminder 1 hour before booking',
    category: 'bookings',
    channels: ['email', 'inApp', 'whatsApp'],
    bodyPreview: 'Your session for "{{experienceName}}" starts in 1 hour. {{joinLink}}',
    sendGridTemplateId: 'd-booking-reminder-1-hour',
    whatsAppTemplateName: 'booking_reminder_1_hour',
    scope: 'user',
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_REMINDER_1_DAY',
    name: 'Booking Reminder (1 Day)',
    title: 'Session Tomorrow',
    description: 'Reminder 1 day before booking',
    category: 'bookings',
    channels: ['email', 'whatsApp'],
    bodyPreview: 'Reminder: Your session for "{{experienceName}}" is tomorrow at {{bookingTime}}.',
    sendGridTemplateId: 'd-booking-reminder-1-day',
    whatsAppTemplateName: 'booking_reminder_1_day',
    scope: 'user',
    targetUserTypes: ['learner'],
  },
  {
    templateId: 'BOOKING_REMINDER_HOST',
    name: 'Booking Reminder (Host)',
    title: 'Upcoming Session',
    description: 'Reminder to host about upcoming booking',
    category: 'bookings',
    channels: ['email', 'inApp'],
    bodyPreview:
      'You have a session for "{{experienceName}}" with {{learnerName}} in {{reminderTime}}.',
    sendGridTemplateId: 'd-booking-reminder-host',
    scope: 'hub',
    targetUserTypes: ['expert', 'hub_owner', 'hub_admin'],
  },

  // ============================================
  // STRIPE & PAYOUT REMINDERS (2)
  // Hub-scoped: financial management
  // ============================================
  {
    templateId: 'STRIPE_VERIFICATION_REQUIRED',
    name: 'Stripe Verification Required',
    title: 'Action Required: Verify Your Payout Account',
    description: 'Sent when Stripe requires additional verification',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'Please verify your payout account to continue receiving payments. {{verificationDetails}}',
    sendGridTemplateId: 'd-stripe-verification-required',
    actions: [
      {
        label: 'Verify Now',
        type: 'primary',
        url: '/hub/settings/payouts',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner'],
  },
  {
    templateId: 'PAYOUT_AVAILABLE',
    name: 'Payout Available',
    title: 'Funds Available for Withdrawal',
    description: 'Sent when funds are available for withdrawal',
    category: 'payments',
    channels: ['email', 'inApp'],
    bodyPreview:
      'You have {{currency}}{{amount}} available for withdrawal. Transfer to your bank account now.',
    sendGridTemplateId: 'd-payout-available',
    actions: [
      {
        label: 'Withdraw Funds',
        type: 'primary',
        url: '/hub/settings/payouts',
        actionType: 'navigate',
      },
    ],
    scope: 'hub',
    targetUserTypes: ['hub_owner'],
  },
];

/**
 * Map category string to enum values
 */
function getNotificationCategory(category: string): NotificationCategory {
  const map: Record<string, NotificationCategory> = {
    system: NotificationCategory.SYSTEM,
    bookings: NotificationCategory.BOOKINGS,
    jobs: NotificationCategory.JOBS,
    payments: NotificationCategory.PAYMENTS,
    members: NotificationCategory.MEMBERS,
    experiences: NotificationCategory.EXPERIENCES,
    promotions: NotificationCategory.PROMOTIONS,
    chats: NotificationCategory.CHATS,
  };
  return map[category] || NotificationCategory.SYSTEM;
}

function getEmailCategory(category: string): EmailTemplateCategory {
  const map: Record<string, EmailTemplateCategory> = {
    system: EmailTemplateCategory.SYSTEM,
    bookings: EmailTemplateCategory.BOOKINGS,
    jobs: EmailTemplateCategory.JOBS,
    payments: EmailTemplateCategory.PAYMENTS,
    members: EmailTemplateCategory.MEMBERS,
    experiences: EmailTemplateCategory.EXPERIENCES,
    promotions: EmailTemplateCategory.PROMOTIONS,
    chats: EmailTemplateCategory.CHATS,
  };
  return map[category] || EmailTemplateCategory.SYSTEM;
}

function getWhatsAppCategory(category: string): WhatsAppTemplateCategory {
  const map: Record<string, WhatsAppTemplateCategory> = {
    system: WhatsAppTemplateCategory.SYSTEM,
    bookings: WhatsAppTemplateCategory.BOOKINGS,
    jobs: WhatsAppTemplateCategory.JOBS,
    payments: WhatsAppTemplateCategory.PAYMENTS,
    members: WhatsAppTemplateCategory.MEMBERS,
    experiences: WhatsAppTemplateCategory.EXPERIENCES,
    promotions: WhatsAppTemplateCategory.PROMOTIONS,
    chats: WhatsAppTemplateCategory.CHATS,
  };
  return map[category] || WhatsAppTemplateCategory.SYSTEM;
}

async function seedNotificationTemplates() {
  try {
    console.log('🔔 Starting notification templates seed...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const stats = {
      inApp: { created: 0, updated: 0 },
      email: { created: 0, updated: 0 },
      whatsApp: { created: 0, updated: 0 },
    };

    console.log('📝 Seeding templates...\n');

    for (const template of TEMPLATES) {
      // Map scope string to enum value
      const scopeValue = template.scope === 'hub' ? NotificationScope.HUB : NotificationScope.USER;
      // Map targetUserTypes strings to enum values
      const targetUserTypesValue = template.targetUserTypes.map((t) => {
        const map: Record<string, TargetUserType> = {
          learner: TargetUserType.LEARNER,
          expert: TargetUserType.EXPERT,
          hub_owner: TargetUserType.HUB_OWNER,
          hub_admin: TargetUserType.HUB_ADMIN,
          hub_collaborator: TargetUserType.HUB_COLLABORATOR,
        };
        return map[t];
      });

      // Seed InAppNotificationTemplate if inApp channel
      if (template.channels.includes('inApp')) {
        const result = await InAppNotificationTemplate.findOneAndUpdate(
          { templateId: template.templateId },
          {
            templateId: template.templateId,
            name: template.name,
            title: template.title,
            description: template.description,
            category: getNotificationCategory(template.category),
            body: template.bodyPreview,
            actions: template.actions || [],
            isActive: true,
            scope: scopeValue,
            targetUserTypes: targetUserTypesValue,
          },
          { upsert: true, new: true },
        );

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          stats.inApp.created++;
        } else {
          stats.inApp.updated++;
        }
      }

      // Seed EmailTemplate if email channel
      if (template.channels.includes('email')) {
        const result = await EmailTemplate.findOneAndUpdate(
          { templateId: template.templateId },
          {
            templateId: template.templateId,
            name: template.name,
            title: template.title,
            description: template.description,
            category: getEmailCategory(template.category),
            sendGridTemplateId:
              template.sendGridTemplateId ||
              `d-${template.templateId.toLowerCase().replace(/_/g, '-')}`,
            isActive: true,
            scope: scopeValue,
            targetUserTypes: targetUserTypesValue,
          },
          { upsert: true, new: true },
        );

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          stats.email.created++;
        } else {
          stats.email.updated++;
        }
      }

      // Seed WhatsAppTemplate if whatsApp channel
      if (template.channels.includes('whatsApp')) {
        const result = await WhatsAppTemplate.findOneAndUpdate(
          { templateId: template.templateId },
          {
            templateId: template.templateId,
            name: template.name,
            title: template.title,
            description: template.description,
            category: getWhatsAppCategory(template.category),
            whatsAppTemplateName:
              template.whatsAppTemplateName || template.templateId.toLowerCase(),
            languageCode: 'en',
            bodyPreview: template.bodyPreview,
            isActive: true,
            scope: scopeValue,
            targetUserTypes: targetUserTypesValue,
          },
          { upsert: true, new: true },
        );

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          stats.whatsApp.created++;
        } else {
          stats.whatsApp.updated++;
        }
      }

      console.log(
        `   ✅ ${template.templateId} (${template.channels.join(', ')}) [${template.scope}]`,
      );
    }

    console.log('\n📊 Summary:');
    console.log(
      `   InApp Templates:    ${stats.inApp.created} created, ${stats.inApp.updated} updated`,
    );
    console.log(
      `   Email Templates:    ${stats.email.created} created, ${stats.email.updated} updated`,
    );
    console.log(
      `   WhatsApp Templates: ${stats.whatsApp.created} created, ${stats.whatsApp.updated} updated`,
    );

    // Print category breakdown
    console.log('\n📂 Templates by Category:');
    const categories = new Map<string, number>();
    for (const template of TEMPLATES) {
      categories.set(template.category, (categories.get(template.category) || 0) + 1);
    }
    for (const [category, count] of Array.from(categories.entries()).sort()) {
      console.log(`   ${category}: ${count}`);
    }

    // Print scope breakdown
    console.log('\n🎯 Templates by Scope:');
    const scopes = new Map<string, number>();
    for (const template of TEMPLATES) {
      scopes.set(template.scope, (scopes.get(template.scope) || 0) + 1);
    }
    for (const [scope, count] of Array.from(scopes.entries()).sort()) {
      console.log(`   ${scope}: ${count}`);
    }

    // Print target user types breakdown
    console.log('\n👤 Templates by Target User Types:');
    const userTypes = new Map<string, number>();
    for (const template of TEMPLATES) {
      if (template.targetUserTypes.length === 0) {
        userTypes.set('all', (userTypes.get('all') || 0) + 1);
      } else {
        for (const type of template.targetUserTypes) {
          userTypes.set(type, (userTypes.get(type) || 0) + 1);
        }
      }
    }
    for (const [type, count] of Array.from(userTypes.entries()).sort()) {
      console.log(`   ${type}: ${count}`);
    }

    console.log(`\n✅ Total: ${TEMPLATES.length} template definitions seeded successfully!\n`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run seed
seedNotificationTemplates();

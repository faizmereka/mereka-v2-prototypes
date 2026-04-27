import mongoose from 'mongoose';
import {
  NOTIFICATION_SCOPE_VALUES,
  NotificationScope,
  TARGET_USER_TYPE_VALUES,
  TargetUserType,
} from './enums/NotificationEnums';

/**
 * Email Template Categories
 * Used for grouping templates in settings UI
 */
export enum EmailTemplateCategory {
  CHATS = 'chats',
  BOOKINGS = 'bookings',
  JOBS = 'jobs',
  PROMOTIONS = 'promotions',
  SYSTEM = 'system',
  EXPERIENCES = 'experiences',
  MEMBERS = 'members',
  PAYMENTS = 'payments',
}

// Re-export enums for convenience
export { NotificationScope, TargetUserType };

/**
 * Email Template Schema
 *
 * Required fields:
 * - templateId: Unique identifier for the template (e.g., LEARNER_WELCOME)
 * - name: Human-readable template name
 * - title: Title shown in preference settings UI
 * - description: Description shown in preference settings UI
 * - category: Category for grouping in settings UI
 * - sendGridTemplateId: SendGrid dynamic template ID
 */
const emailTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      comment: 'Unique template ID (e.g., LEARNER_WELCOME)',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      comment: 'Human-readable template name',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      comment: 'Title shown in preference settings UI',
    },
    description: {
      type: String,
      required: true,
      trim: true,
      comment: 'Description shown in preference settings UI',
    },
    category: {
      type: String,
      enum: Object.values(EmailTemplateCategory),
      required: true,
      comment: 'Category for grouping in settings UI',
    },
    sendGridTemplateId: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scope: {
      type: String,
      enum: NOTIFICATION_SCOPE_VALUES,
      default: NotificationScope.USER,
      comment: 'Notification scope: user (personal) or hub (hub-related)',
    },
    targetUserTypes: {
      type: [String],
      enum: TARGET_USER_TYPE_VALUES,
      default: [],
      comment: 'Target user types. Empty array = all user types',
    },
  },
  {
    timestamps: true,
    collection: 'emailTemplates',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes (templateId already has unique index via schema definition)
emailTemplateSchema.index({ isActive: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ scope: 1 });
emailTemplateSchema.index({ targetUserTypes: 1 });
emailTemplateSchema.index({ createdAt: -1 });

/**
 * TypeScript Interface for EmailTemplate
 */
export interface IEmailTemplate extends mongoose.Document {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: EmailTemplateCategory;
  sendGridTemplateId: string;
  isActive: boolean;
  scope: NotificationScope;
  targetUserTypes: TargetUserType[];
  createdAt: Date;
  updatedAt: Date;
}

export const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);

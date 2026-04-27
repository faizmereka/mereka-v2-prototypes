import mongoose from 'mongoose';
import {
  NOTIFICATION_SCOPE_VALUES,
  NotificationScope,
  TARGET_USER_TYPE_VALUES,
  TargetUserType,
} from './enums/NotificationEnums';

/**
 * Notification Template Categories
 * Used for grouping templates in settings UI
 */
export enum NotificationCategory {
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
 * Notification Action Type
 * Defines what happens when user clicks an action button
 */
export interface INotificationAction {
  label: string;
  type: 'primary' | 'secondary';
  url?: string;
  actionType?: string; // e.g., 'navigate', 'dismiss', 'accept', 'decline'
}

/**
 * In-App Notification Template Schema
 * Stores templates for in-app notifications shown to users
 *
 * Renamed from NotificationTemplate for clarity - this is for in-app notifications only.
 *
 * Fields:
 * - templateId: Unique identifier (e.g., BOOKING_CONFIRMATION)
 * - name: Human-readable template name
 * - title: Title shown in preference settings UI
 * - description: Description shown in preference settings UI
 * - category: Category for grouping in settings UI
 * - body: Template body with {{placeholders}}
 * - actions: Optional action button configuration
 * - isActive: Whether template is currently active
 */
const inAppNotificationTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      comment: 'Unique template ID (e.g., BOOKING_CONFIRMATION)',
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
      enum: Object.values(NotificationCategory),
      required: true,
      comment: 'Category for grouping in settings UI',
    },
    body: {
      type: String,
      required: true,
      comment: 'Template body with {{placeholders}}',
    },
    actions: [
      {
        label: { type: String, required: true },
        type: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
        url: { type: String },
        actionType: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      comment: 'Whether this template is currently active',
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
    collection: 'inAppNotificationTemplates',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes (templateId already has unique index via schema definition)
inAppNotificationTemplateSchema.index({ isActive: 1 });
inAppNotificationTemplateSchema.index({ category: 1 });
inAppNotificationTemplateSchema.index({ scope: 1 });
inAppNotificationTemplateSchema.index({ targetUserTypes: 1 });
inAppNotificationTemplateSchema.index({ createdAt: -1 });

/**
 * TypeScript Interface for InAppNotificationTemplate
 */
export interface IInAppNotificationTemplate extends mongoose.Document {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: NotificationCategory;
  body: string;
  actions?: INotificationAction[];
  isActive: boolean;
  scope: NotificationScope;
  targetUserTypes: TargetUserType[];
  createdAt: Date;
  updatedAt: Date;
}

export const InAppNotificationTemplate = mongoose.model<IInAppNotificationTemplate>(
  'InAppNotificationTemplate',
  inAppNotificationTemplateSchema,
);

// Keep old export for backward compatibility during migration
export { InAppNotificationTemplate as NotificationTemplate };
export type { IInAppNotificationTemplate as INotificationTemplate };

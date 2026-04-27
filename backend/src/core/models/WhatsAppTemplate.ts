import mongoose from 'mongoose';
import {
  NOTIFICATION_SCOPE_VALUES,
  NotificationScope,
  TARGET_USER_TYPE_VALUES,
  TargetUserType,
} from './enums/NotificationEnums';

/**
 * WhatsApp Template Categories
 * Used for grouping templates in settings UI
 */
export enum WhatsAppTemplateCategory {
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
 * WhatsApp Template Schema
 * Stores templates for WhatsApp messages
 *
 * Fields:
 * - templateId: Unique identifier (e.g., EXPERIENCE_REMINDER_BOOKER_1_HOUR)
 * - name: Human-readable template name
 * - title: Title shown in preference settings UI
 * - description: Description shown in preference settings UI
 * - category: Category for grouping in settings UI
 * - whatsAppTemplateName: WhatsApp Business API template name (from Meta)
 * - languageCode: Template language code
 * - bodyPreview: Preview of message body with {{placeholders}}
 * - isActive: Whether template is currently active
 */
const whatsAppTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      comment: 'Unique template ID (e.g., EXPERIENCE_REMINDER_BOOKER_1_HOUR)',
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
      enum: Object.values(WhatsAppTemplateCategory),
      required: true,
      comment: 'Category for grouping in settings UI',
    },
    whatsAppTemplateName: {
      type: String,
      required: true,
      trim: true,
      comment: 'WhatsApp Business API template name (from Meta)',
    },
    languageCode: {
      type: String,
      default: 'en',
      trim: true,
      comment: 'Template language code',
    },
    bodyPreview: {
      type: String,
      required: true,
      comment: 'Preview of message body with {{placeholders}}',
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
    collection: 'whatsAppTemplates',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes (templateId already has unique index via schema definition)
whatsAppTemplateSchema.index({ isActive: 1 });
whatsAppTemplateSchema.index({ category: 1 });
whatsAppTemplateSchema.index({ scope: 1 });
whatsAppTemplateSchema.index({ targetUserTypes: 1 });
whatsAppTemplateSchema.index({ createdAt: -1 });

/**
 * TypeScript Interface for WhatsAppTemplate
 */
export interface IWhatsAppTemplate extends mongoose.Document {
  templateId: string;
  name: string;
  title: string;
  description: string;
  category: WhatsAppTemplateCategory;
  whatsAppTemplateName: string;
  languageCode: string;
  bodyPreview: string;
  isActive: boolean;
  scope: NotificationScope;
  targetUserTypes: TargetUserType[];
  createdAt: Date;
  updatedAt: Date;
}

export const WhatsAppTemplate = mongoose.model<IWhatsAppTemplate>(
  'WhatsAppTemplate',
  whatsAppTemplateSchema,
);

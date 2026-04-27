import mongoose from 'mongoose';

/**
 * WhatsApp Message Status Enum
 */
export enum WhatsAppStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

/**
 * WhatsApp Log Schema
 * Stores WhatsApp message logs and delivery status
 *
 * Fields:
 * - toPhone: Recipient phone number
 * - templateId: Reference to WhatsApp template used
 * - whatsAppTemplateName: WhatsApp Business API template name
 * - data: Template placeholder data
 * - status: Message delivery status
 * - providerMessageId: Message ID from WhatsApp/provider
 * - userId: Optional reference to user
 * - hubId: Optional reference to hub
 * - error: Error message if failed
 * - sentAt: When message was sent
 * - deliveredAt: When message was delivered
 * - readAt: When message was read
 */
const whatsAppLogSchema = new mongoose.Schema(
  {
    toPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
      comment: 'Recipient phone number',
    },
    templateId: {
      type: String,
      required: true,
      index: true,
      comment: 'Reference to WhatsApp template used',
    },
    whatsAppTemplateName: {
      type: String,
      required: true,
      trim: true,
      comment: 'WhatsApp Business API template name',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      comment: 'Template placeholder data',
    },
    status: {
      type: String,
      enum: Object.values(WhatsAppStatus),
      default: WhatsAppStatus.PENDING,
      index: true,
    },
    providerMessageId: {
      type: String,
      index: true,
      comment: 'Message ID from WhatsApp/provider',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
    },
    error: {
      type: String,
      comment: 'Error message if failed',
    },
    sentAt: {
      type: Date,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'whatsAppLogs',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes
whatsAppLogSchema.index({ toPhone: 1, createdAt: -1 });
whatsAppLogSchema.index({ templateId: 1, status: 1 });
whatsAppLogSchema.index({ userId: 1, createdAt: -1 });
whatsAppLogSchema.index({ hubId: 1, createdAt: -1 });
whatsAppLogSchema.index({ createdAt: -1 });

/**
 * TypeScript Interface for WhatsAppLog
 */
export interface IWhatsAppLog extends mongoose.Document {
  toPhone: string;
  templateId: string;
  whatsAppTemplateName: string;
  data: Record<string, unknown>;
  status: WhatsAppStatus;
  providerMessageId?: string;
  userId?: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const WhatsAppLog = mongoose.model<IWhatsAppLog>('WhatsAppLog', whatsAppLogSchema);

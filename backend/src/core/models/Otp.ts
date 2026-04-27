import crypto from 'node:crypto';

import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * OTP Purpose Enum
 */
export enum OtpPurpose {
  LOGIN = 'login',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

/**
 * OTP document interface
 */
export interface IOtp extends Document {
  email: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  verifyOtp(otp: string): boolean;
}

/**
 * OTP Schema
 * Stores hashed OTP codes for secure verification
 */
const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(OtpPurpose),
      default: OtpPurpose.LOGIN,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'otps',
  },
);

// Compound index for efficient lookup
otpSchema.index({ email: 1, purpose: 1 });

// TTL index to auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Verify OTP against stored hash
 */
otpSchema.methods.verifyOtp = function (otp: string): boolean {
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return this.otpHash === hash;
};

/**
 * Static method to generate a secure 6-digit OTP
 */
otpSchema.statics.generateOtp = (): string => {
  // Generate cryptographically secure random number
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  // Convert to 6 digits (100000 - 999999)
  const otp = (num % 900000) + 100000;
  return otp.toString();
};

/**
 * Static method to hash an OTP
 */
otpSchema.statics.hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Static interface for TypeScript
export interface IOtpModel extends mongoose.Model<IOtp> {
  generateOtp(): string;
  hashOtp(otp: string): string;
}

export const Otp = mongoose.model<IOtp, IOtpModel>('Otp', otpSchema);

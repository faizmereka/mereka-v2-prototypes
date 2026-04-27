import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Company Type Interface
 * Type of company/organization
 */
export interface ICompanyType extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Company Type schema definition
 */
const companyTypeSchema = new Schema<ICompanyType>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
companyTypeSchema.index({ isActive: 1, priority: 1 });

export const CompanyType = mongoose.model<ICompanyType>('CompanyType', companyTypeSchema);

import { Bank, BankApprovalStatus, type IBank } from '@core/models/Bank';
import type { AdminCreateBankInput, AdminUpdateBankInput } from '@schemas/admin';

/**
 * List Banks Query interface
 */
export interface AdminListBanksQuery {
  countryCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Admin Bank Service
 * Handles business logic for available banks
 */
export class AdminBankService {
  /**
   * Create a new bank
   */
  async createBank(data: AdminCreateBankInput): Promise<IBank> {
    // Check for duplicate bank name in the same country
    const existing = await Bank.findOne({
      name: data.name,
      countryCode: data.countryCode,
    });
    if (existing) {
      throw new Error(`Bank "${data.name}" already exists for country ${data.countryCode}`);
    }

    const bank = await Bank.create(data);
    return bank.toObject();
  }

  /**
   * Get bank by ID
   */
  async getBankById(bankId: string): Promise<IBank | null> {
    const bank = await Bank.findById(bankId);
    return bank ? bank.toObject() : null;
  }

  /**
   * List all banks with optional filtering
   */
  async listBanks(query: AdminListBanksQuery): Promise<{
    banks: IBank[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { countryCode, isActive, page = 1, limit = 100 } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (countryCode) {
      filter.countryCode = countryCode.toUpperCase();
    }
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Execute queries in parallel
    const [banks, total] = await Promise.all([
      Bank.find(filter).sort({ priority: -1, name: 1 }).skip(skip).limit(limit).lean(),
      Bank.countDocuments(filter),
    ]);

    return {
      banks: banks as unknown as IBank[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List all active and approved banks for a specific country (for dropdown/selection)
   */
  async listActiveBanksByCountry(countryCode: string): Promise<IBank[]> {
    const banks = await Bank.find({
      countryCode: countryCode.toUpperCase(),
      isActive: true,
      approvalStatus: BankApprovalStatus.APPROVED,
    })
      .sort({ priority: -1, name: 1 })
      .lean();
    return banks as unknown as IBank[];
  }

  /**
   * List all active and approved banks (for dropdown/selection)
   */
  async listActiveBanks(): Promise<IBank[]> {
    const banks = await Bank.find({
      isActive: true,
      approvalStatus: BankApprovalStatus.APPROVED,
    })
      .sort({ countryCode: 1, priority: -1, name: 1 })
      .lean();
    return banks as unknown as IBank[];
  }

  /**
   * List all pending banks for admin approval
   */
  async listPendingBanks(): Promise<IBank[]> {
    const banks = await Bank.find({
      approvalStatus: BankApprovalStatus.PENDING,
    })
      .sort({ createdAt: -1 })
      .lean();
    return banks as unknown as IBank[];
  }

  /**
   * Approve a bank
   */
  async approveBank(bankId: string, adminUserId: string): Promise<IBank> {
    const bank = await Bank.findById(bankId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    bank.approvalStatus = BankApprovalStatus.APPROVED;
    bank.approvedBy = adminUserId;
    bank.approvedAt = new Date();
    await bank.save();

    return bank.toObject();
  }

  /**
   * Reject a bank
   */
  async rejectBank(bankId: string): Promise<void> {
    const bank = await Bank.findById(bankId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    bank.approvalStatus = BankApprovalStatus.REJECTED;
    bank.isActive = false;
    await bank.save();
  }

  /**
   * Update bank by ID
   */
  async updateBank(bankId: string, data: AdminUpdateBankInput): Promise<IBank> {
    // Check if bank exists
    const bank = await Bank.findById(bankId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    // Check for duplicate name if name or countryCode is being updated
    if (data.name || data.countryCode) {
      const newName = data.name || bank.name;
      const newCountryCode = data.countryCode || bank.countryCode;

      if (newName !== bank.name || newCountryCode !== bank.countryCode) {
        const existing = await Bank.findOne({
          name: newName,
          countryCode: newCountryCode,
          _id: { $ne: bankId },
        });
        if (existing) {
          throw new Error(`Bank "${newName}" already exists for country ${newCountryCode}`);
        }
      }
    }

    // Update bank
    Object.assign(bank, data);
    await bank.save();

    return bank.toObject();
  }

  /**
   * Delete bank by ID (soft delete - set isActive to false)
   */
  async deleteBank(bankId: string): Promise<void> {
    const bank = await Bank.findById(bankId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    bank.isActive = false;
    await bank.save();
  }

  /**
   * Hard delete bank by ID (permanent)
   */
  async hardDeleteBank(bankId: string): Promise<void> {
    const bank = await Bank.findById(bankId);
    if (!bank) {
      throw new Error('Bank not found');
    }

    await Bank.deleteOne({ _id: bankId });
  }
}

export const adminBankService = new AdminBankService();

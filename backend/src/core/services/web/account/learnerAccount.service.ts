import { User } from '@core/models/User';
import type { LearnerAccountResponse, UpdateLearnerAccountInput } from '@schemas/web';

/**
 * Learner Account Service
 * Provides account details and update functionality for authenticated learners
 */
class LearnerAccountService {
  /**
   * Get account details for a learner
   */
  async getAccount(userId: string): Promise<LearnerAccountResponse> {
    const user = await User.findById(userId)
      .select(
        'name username email phoneNumber birthDate locale currency timeZone emailVerified profilePhoto',
      )
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return this.formatAccountResponse(user);
  }

  /**
   * Update account details for a learner
   */
  async updateAccount(
    userId: string,
    data: UpdateLearnerAccountInput,
  ): Promise<LearnerAccountResponse> {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (data.displayName !== undefined) {
      updateData.name = data.displayName;
    }

    if (data.username !== undefined) {
      // Check if username is already taken
      const existingUser = await User.findOne({
        username: data.username.toLowerCase(),
        _id: { $ne: userId },
      }).lean();

      if (existingUser) {
        throw new Error('Username is already taken');
      }

      updateData.username = data.username.toLowerCase();
    }

    if (data.birthDate !== undefined) {
      updateData.birthDate = new Date(data.birthDate);
    }

    if (data.language !== undefined) {
      updateData.locale = data.language;
    }

    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }

    if (data.timeZone !== undefined) {
      updateData.timeZone = data.timeZone;
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    )
      .select(
        'name username email phoneNumber birthDate locale currency timeZone emailVerified profilePhoto',
      )
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return this.formatAccountResponse(user);
  }

  /**
   * Format user document to account response
   */
  private formatAccountResponse(user: {
    name?: string;
    username?: string;
    email: string;
    phoneNumber?: string;
    birthDate?: Date;
    locale?: string;
    currency?: string;
    timeZone?: string;
    emailVerified?: boolean;
    profilePhoto?: string;
  }): LearnerAccountResponse {
    let birthDateStr: string | null = null;
    if (user.birthDate) {
      const isoString = user.birthDate.toISOString();
      birthDateStr = isoString.split('T')[0] ?? null;
    }

    return {
      accountType: 'User',
      displayName: user.name || '',
      username: user.username ?? null,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
      birthDate: birthDateStr,
      language: user.locale ?? null,
      currency: user.currency || 'MYR',
      timeZone: user.timeZone || 'Asia/Kuala_Lumpur',
      emailVerified: user.emailVerified || false,
      profilePhoto: user.profilePhoto ?? null,
    };
  }
}

export const learnerAccountService = new LearnerAccountService();

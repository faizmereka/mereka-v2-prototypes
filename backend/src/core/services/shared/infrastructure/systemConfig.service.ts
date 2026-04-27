import {
  DEFAULT_RATE_LIMITS,
  type IRateLimitConfig,
  type ISystemConfig,
  SystemConfig,
} from '@core/models/SystemConfig';

const SYSTEM_CONFIG_ID = 'system-config';

/**
 * System Config Service
 * Manages system-wide configuration stored in MongoDB
 */
export class SystemConfigService {
  /**
   * Get or create the system config document
   */
  async getConfig(): Promise<ISystemConfig> {
    let config = await SystemConfig.findById(SYSTEM_CONFIG_ID);

    if (!config) {
      // Create default config if it doesn't exist
      config = await SystemConfig.create({
        _id: SYSTEM_CONFIG_ID,
        rateLimits: DEFAULT_RATE_LIMITS,
      });
    }

    return config;
  }

  /**
   * Get rate limit configuration
   */
  async getRateLimits(): Promise<IRateLimitConfig> {
    const config = await this.getConfig();
    return config.rateLimits;
  }

  /**
   * Update rate limit configuration
   */
  async updateRateLimits(
    rateLimits: IRateLimitConfig,
    updatedBy?: string,
  ): Promise<IRateLimitConfig> {
    const config = await SystemConfig.findByIdAndUpdate(
      SYSTEM_CONFIG_ID,
      {
        $set: {
          rateLimits,
          ...(updatedBy && { updatedBy }),
        },
      },
      { new: true, upsert: true },
    );

    if (!config) {
      throw new Error('Failed to update rate limit configuration');
    }

    return config.rateLimits;
  }

  /**
   * Initialize default config (for seeding)
   */
  async initializeDefaults(): Promise<ISystemConfig> {
    const existing = await SystemConfig.findById(SYSTEM_CONFIG_ID);

    if (existing) {
      return existing;
    }

    return await SystemConfig.create({
      _id: SYSTEM_CONFIG_ID,
      rateLimits: DEFAULT_RATE_LIMITS,
    });
  }
}

// Export singleton instance
export const systemConfigService = new SystemConfigService();

import { type ITargetAudience, TargetAudience } from '@core/models/TargetAudience';
import type {
  AdminCreateTargetAudienceInput,
  AdminListTargetAudiencesQuery,
  AdminUpdateTargetAudienceInput,
} from '@schemas/admin';

/**
 * Target Audience Service
 * Handles business logic for target audience types
 */
export class TargetAudienceService {
  /**
   * Create a new target audience
   */
  async createAudience(data: AdminCreateTargetAudienceInput): Promise<ITargetAudience> {
    // Check for duplicate audience name
    const existing = await TargetAudience.findOne({ name: data.name });
    if (existing) {
      throw new Error(`Audience with name "${data.name}" already exists`);
    }

    const audience = await TargetAudience.create(data);
    return audience.toObject();
  }

  /**
   * Get audience by ID
   */
  async getAudienceById(audienceId: string): Promise<ITargetAudience | null> {
    const audience = await TargetAudience.findById(audienceId);
    return audience ? audience.toObject() : null;
  }

  /**
   * List all audiences with optional filtering
   */
  async listAudiences(query: AdminListTargetAudiencesQuery): Promise<{
    audiences: ITargetAudience[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { isActive, page = 1, limit = 100 } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Execute queries in parallel
    const [audiences, total] = await Promise.all([
      TargetAudience.find(filter).sort({ priority: 1, name: 1 }).skip(skip).limit(limit).lean(),
      TargetAudience.countDocuments(filter),
    ]);

    return {
      audiences: audiences as unknown as ITargetAudience[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List all active audiences (for dropdown/selection)
   */
  async listActiveAudiences(): Promise<ITargetAudience[]> {
    const audiences = await TargetAudience.find({ isActive: true })
      .sort({ priority: 1, name: 1 })
      .lean();
    return audiences as unknown as ITargetAudience[];
  }

  /**
   * Update audience by ID
   */
  async updateAudience(
    audienceId: string,
    data: AdminUpdateTargetAudienceInput,
  ): Promise<ITargetAudience> {
    // Check if audience exists
    const audience = await TargetAudience.findById(audienceId);
    if (!audience) {
      throw new Error('Audience not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== audience.name) {
      const existing = await TargetAudience.findOne({ name: data.name });
      if (existing) {
        throw new Error(`Audience with name "${data.name}" already exists`);
      }
    }

    // Update audience
    Object.assign(audience, data);
    await audience.save();

    return audience.toObject();
  }

  /**
   * Delete audience by ID (soft delete - set isActive to false)
   */
  async deleteAudience(audienceId: string): Promise<void> {
    const audience = await TargetAudience.findById(audienceId);
    if (!audience) {
      throw new Error('Audience not found');
    }

    audience.isActive = false;
    await audience.save();
  }
}

export const targetAudienceService = new TargetAudienceService();

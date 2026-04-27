import { type IJobPreference, JobPreference } from '@core/models/JobPreference';

/**
 * JobPreference Service
 * Handles business logic for job preferences
 */
export class JobPreferenceService {
  /**
   * Get all job preferences (active by default)
   */
  async getAll(includeInactive = false): Promise<IJobPreference[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return JobPreference.find(filter)
      .sort({ priority: 1, name: 1 })
      .lean() as unknown as IJobPreference[];
  }

  /**
   * Get job preference by ID
   */
  async getById(id: string): Promise<IJobPreference | null> {
    return JobPreference.findById(id).lean() as unknown as IJobPreference | null;
  }

  /**
   * Create new job preference
   */
  async create(data: Partial<IJobPreference>): Promise<IJobPreference> {
    // Check for duplicate name
    if (data.name) {
      const existing = await JobPreference.findOne({ name: data.name });
      if (existing) {
        throw new Error('Job preference with this name already exists');
      }
    }

    return JobPreference.create(data) as unknown as IJobPreference;
  }

  /**
   * Update job preference
   */
  async update(id: string, data: Partial<IJobPreference>): Promise<IJobPreference | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await JobPreference.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Job preference with this name already exists');
      }
    }

    return JobPreference.findByIdAndUpdate(id, data, {
      new: true,
    }).lean() as unknown as IJobPreference | null;
  }

  /**
   * Delete job preference (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<IJobPreference | null> {
    return JobPreference.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as IJobPreference | null;
  }
}

export const jobPreferenceService = new JobPreferenceService();

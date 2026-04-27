import { ExperienceType, type IExperienceType } from '@core/models/ExperienceType';

/**
 * ExperienceType Service
 * Handles business logic for experience types
 */
export class ExperienceTypeService {
  /**
   * Get all experience types (active by default)
   */
  async getAll(includeInactive = false): Promise<IExperienceType[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return ExperienceType.find(filter)
      .sort({ priority: 1, name: 1 })
      .lean() as unknown as IExperienceType[];
  }

  /**
   * Get experience type by ID
   */
  async getById(id: string): Promise<IExperienceType | null> {
    return ExperienceType.findById(id).lean() as unknown as IExperienceType | null;
  }

  /**
   * Create new experience type
   */
  async create(data: Partial<IExperienceType>): Promise<IExperienceType> {
    // Check for duplicate name
    if (data.name) {
      const existing = await ExperienceType.findOne({ name: data.name });
      if (existing) {
        throw new Error('Experience type with this name already exists');
      }
    }

    return ExperienceType.create(data) as unknown as IExperienceType;
  }

  /**
   * Update experience type
   */
  async update(id: string, data: Partial<IExperienceType>): Promise<IExperienceType | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await ExperienceType.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Experience type with this name already exists');
      }
    }

    return ExperienceType.findByIdAndUpdate(id, data, {
      new: true,
    }).lean() as unknown as IExperienceType | null;
  }

  /**
   * Delete experience type (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<IExperienceType | null> {
    return ExperienceType.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as IExperienceType | null;
  }
}

export const experienceTypeService = new ExperienceTypeService();

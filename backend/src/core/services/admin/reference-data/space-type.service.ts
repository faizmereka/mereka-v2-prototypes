import { type ISpaceType, SpaceType } from '@core/models/SpaceType';

/**
 * SpaceType Service
 * Handles business logic for space types
 */
export class SpaceTypeService {
  /**
   * Get all space types (active by default)
   */
  async getAll(includeInactive = false): Promise<ISpaceType[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return SpaceType.find(filter).sort({ priority: 1, name: 1 }).lean() as unknown as ISpaceType[];
  }

  /**
   * Get space type by ID
   */
  async getById(id: string): Promise<ISpaceType | null> {
    return SpaceType.findById(id).lean() as unknown as ISpaceType | null;
  }

  /**
   * Create new space type
   */
  async create(data: Partial<ISpaceType>): Promise<ISpaceType> {
    // Check for duplicate name
    if (data.name) {
      const existing = await SpaceType.findOne({ name: data.name });
      if (existing) {
        throw new Error('Space type with this name already exists');
      }
    }

    return SpaceType.create(data) as unknown as ISpaceType;
  }

  /**
   * Update space type
   */
  async update(id: string, data: Partial<ISpaceType>): Promise<ISpaceType | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await SpaceType.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Space type with this name already exists');
      }
    }

    return SpaceType.findByIdAndUpdate(id, data, {
      new: true,
    }).lean() as unknown as ISpaceType | null;
  }

  /**
   * Delete space type (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<ISpaceType | null> {
    return SpaceType.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as ISpaceType | null;
  }
}

export const spaceTypeService = new SpaceTypeService();

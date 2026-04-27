import { Facility, type IFacility } from '@core/models/Facility';

/**
 * Facility Service
 * Handles business logic for facilities (Conference Room, Kitchen, etc.)
 */
export class FacilityService {
  /**
   * Get all facilities (active by default)
   */
  async getAll(includeInactive = false): Promise<IFacility[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return Facility.find(filter).sort({ priority: 1, name: 1 }).lean() as unknown as IFacility[];
  }

  /**
   * Get facility by ID
   */
  async getById(id: string): Promise<IFacility | null> {
    return Facility.findById(id).lean() as unknown as IFacility | null;
  }

  /**
   * Create new facility
   */
  async create(data: Partial<IFacility>): Promise<IFacility> {
    // Check for duplicate name
    if (data.name) {
      const existing = await Facility.findOne({ name: data.name });
      if (existing) {
        throw new Error('Facility with this name already exists');
      }
    }

    return Facility.create(data) as unknown as IFacility;
  }

  /**
   * Update facility
   */
  async update(id: string, data: Partial<IFacility>): Promise<IFacility | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await Facility.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Facility with this name already exists');
      }
    }

    return Facility.findByIdAndUpdate(id, data, {
      new: true,
    }).lean() as unknown as IFacility | null;
  }

  /**
   * Delete facility (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<IFacility | null> {
    return Facility.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as IFacility | null;
  }
}

export const facilityService = new FacilityService();

import { Amenity, type IAmenity } from '@core/models/Amenity';

/**
 * Amenity Service
 * Handles business logic for amenities (WiFi, Parking, etc.)
 */
export class AmenityService {
  /**
   * Get all amenities (active by default)
   */
  async getAll(includeInactive = false): Promise<IAmenity[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return Amenity.find(filter).sort({ priority: 1, name: 1 }).lean() as unknown as IAmenity[];
  }

  /**
   * Get amenity by ID
   */
  async getById(id: string): Promise<IAmenity | null> {
    return Amenity.findById(id).lean() as unknown as IAmenity | null;
  }

  /**
   * Create new amenity
   */
  async create(data: Partial<IAmenity>): Promise<IAmenity> {
    // Check for duplicate name
    if (data.name) {
      const existing = await Amenity.findOne({ name: data.name });
      if (existing) {
        throw new Error('Amenity with this name already exists');
      }
    }

    return Amenity.create(data) as unknown as IAmenity;
  }

  /**
   * Update amenity
   */
  async update(id: string, data: Partial<IAmenity>): Promise<IAmenity | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await Amenity.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Amenity with this name already exists');
      }
    }

    return Amenity.findByIdAndUpdate(id, data, { new: true }).lean() as unknown as IAmenity | null;
  }

  /**
   * Delete amenity (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<IAmenity | null> {
    return Amenity.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as IAmenity | null;
  }
}

export const amenityService = new AmenityService();

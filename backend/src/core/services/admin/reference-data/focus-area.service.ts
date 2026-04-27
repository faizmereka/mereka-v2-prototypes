import { FocusArea, type IFocusArea } from '@core/models/FocusArea';

/**
 * FocusArea Service
 * Handles business logic for focus areas (Business, Technology, Design, etc.)
 */
export class FocusAreaService {
  /**
   * Get all focus areas (active by default)
   */
  async getAll(includeInactive = false): Promise<IFocusArea[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return FocusArea.find(filter).sort({ priority: 1, name: 1 }).lean() as unknown as IFocusArea[];
  }

  /**
   * Get focus area by ID
   */
  async getById(id: string): Promise<IFocusArea | null> {
    return FocusArea.findById(id).lean() as unknown as IFocusArea | null;
  }

  /**
   * Create new focus area
   */
  async create(data: Partial<IFocusArea>): Promise<IFocusArea> {
    // Check for duplicate name
    if (data.name) {
      const existing = await FocusArea.findOne({ name: data.name });
      if (existing) {
        throw new Error('Focus area with this name already exists');
      }
    }

    return FocusArea.create(data) as unknown as IFocusArea;
  }

  /**
   * Update focus area
   */
  async update(id: string, data: Partial<IFocusArea>): Promise<IFocusArea | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await FocusArea.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Focus area with this name already exists');
      }
    }

    return FocusArea.findByIdAndUpdate(id, data, {
      new: true,
    }).lean() as unknown as IFocusArea | null;
  }

  /**
   * Delete focus area (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<IFocusArea | null> {
    return FocusArea.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as IFocusArea | null;
  }
}

export const focusAreaService = new FocusAreaService();

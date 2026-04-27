import { type ISkill, Skill } from '@core/models/Skill';

/**
 * Skill Service
 * Handles business logic for skills (has focusAreaId relationship)
 */
export class SkillService {
  /**
   * Get all skills (active by default)
   */
  async getAll(includeInactive = false): Promise<ISkill[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return Skill.find(filter).sort({ priority: 1, name: 1 }).lean() as unknown as ISkill[];
  }

  /**
   * Get skill by ID
   */
  async getById(id: string): Promise<ISkill | null> {
    return Skill.findById(id).lean() as unknown as ISkill | null;
  }

  /**
   * Create new skill
   */
  async create(data: Partial<ISkill>): Promise<ISkill> {
    // Check for duplicate name
    if (data.name) {
      const existing = await Skill.findOne({ name: data.name });
      if (existing) {
        throw new Error('Skill with this name already exists');
      }
    }

    return Skill.create(data) as unknown as ISkill;
  }

  /**
   * Update skill
   */
  async update(id: string, data: Partial<ISkill>): Promise<ISkill | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await Skill.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Skill with this name already exists');
      }
    }

    return Skill.findByIdAndUpdate(id, data, { new: true }).lean() as unknown as ISkill | null;
  }

  /**
   * Delete skill (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<ISkill | null> {
    return Skill.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as ISkill | null;
  }

  /**
   * Get skills by focus area
   */
  async getByFocusArea(focusAreaId: string): Promise<ISkill[]> {
    return Skill.find({ focusAreaId, isActive: true })
      .sort({ priority: 1, name: 1 })
      .lean() as unknown as ISkill[];
  }

  /**
   * Get all skills with focus area populated
   */
  async getAllWithFocusArea(includeInactive = false): Promise<ISkill[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return Skill.find(filter)
      .populate('focusAreaId', 'name')
      .sort({ priority: 1, name: 1 })
      .lean() as unknown as ISkill[];
  }
}

export const skillService = new SkillService();

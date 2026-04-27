import { ExperienceTheme, type IExperienceTheme } from '@core/models/ExperienceTheme';
import type {
  AdminCreateExperienceThemeInput,
  AdminListExperienceThemesQuery,
  AdminUpdateExperienceThemeInput,
} from '@schemas/admin';

/**
 * Experience Theme Service
 * Handles business logic for experience themes/categories
 */
export class ExperienceThemeService {
  /**
   * Create a new experience theme
   */
  async createTheme(data: AdminCreateExperienceThemeInput): Promise<IExperienceTheme> {
    // Check for duplicate theme name
    const existing = await ExperienceTheme.findOne({ name: data.name });
    if (existing) {
      throw new Error(`Theme with name "${data.name}" already exists`);
    }

    const theme = await ExperienceTheme.create(data);
    return theme.toObject();
  }

  /**
   * Get theme by ID
   */
  async getThemeById(themeId: string): Promise<IExperienceTheme | null> {
    const theme = await ExperienceTheme.findById(themeId);
    return theme ? theme.toObject() : null;
  }

  /**
   * List all themes with optional filtering
   */
  async listThemes(query: AdminListExperienceThemesQuery): Promise<{
    themes: IExperienceTheme[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) {
      // Handle both boolean and string "true"/"false" from query params
      filter.isActive = typeof isActive === 'string' ? isActive === 'true' : isActive;
    }

    // Execute queries in parallel
    const [themes, total] = await Promise.all([
      ExperienceTheme.find(filter).sort({ priority: 1, name: 1 }).skip(skip).limit(limit).lean(),
      ExperienceTheme.countDocuments(filter),
    ]);

    return {
      themes: themes as unknown as IExperienceTheme[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List all active themes (for dropdown/selection)
   */
  async listActiveThemes(): Promise<IExperienceTheme[]> {
    const themes = await ExperienceTheme.find({ isActive: true })
      .sort({ priority: 1, name: 1 })
      .lean();
    return themes as unknown as IExperienceTheme[];
  }

  /**
   * Update theme by ID
   */
  async updateTheme(
    themeId: string,
    data: AdminUpdateExperienceThemeInput,
  ): Promise<IExperienceTheme> {
    // Check if theme exists
    const theme = await ExperienceTheme.findById(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== theme.name) {
      const existing = await ExperienceTheme.findOne({ name: data.name });
      if (existing) {
        throw new Error(`Theme with name "${data.name}" already exists`);
      }
    }

    // Update theme
    Object.assign(theme, data);
    await theme.save();

    return theme.toObject();
  }

  /**
   * Delete theme by ID (soft delete - set isActive to false)
   */
  async deleteTheme(themeId: string): Promise<void> {
    const theme = await ExperienceTheme.findById(themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    theme.isActive = false;
    await theme.save();
  }

  /**
   * Increment experience count for a theme
   */
  async incrementCount(themeId: string): Promise<void> {
    await ExperienceTheme.findByIdAndUpdate(themeId, {
      $inc: { count: 1 },
    });
  }

  /**
   * Decrement experience count for a theme
   */
  async decrementCount(themeId: string): Promise<void> {
    await ExperienceTheme.findByIdAndUpdate(themeId, {
      $inc: { count: -1 },
    });
  }
}

export const experienceThemeService = new ExperienceThemeService();

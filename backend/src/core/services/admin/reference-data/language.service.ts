import { type ILanguage, Language } from '@core/models/Language';
import type { AdminCreateLanguageInput, AdminUpdateLanguageInput } from '@schemas/admin';

/**
 * List Languages Query interface
 */
export interface ListLanguagesQuery {
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Language Service
 * Handles business logic for available languages
 */
export class LanguageService {
  /**
   * Create a new language
   */
  async createLanguage(data: AdminCreateLanguageInput): Promise<ILanguage> {
    // Check for duplicate language name
    const existing = await Language.findOne({ name: data.name });
    if (existing) {
      throw new Error(`Language with name "${data.name}" already exists`);
    }

    const language = await Language.create(data);
    return language.toObject();
  }

  /**
   * Get language by ID
   */
  async getLanguageById(languageId: string): Promise<ILanguage | null> {
    const language = await Language.findById(languageId);
    return language ? language.toObject() : null;
  }

  /**
   * List all languages with optional filtering
   */
  async listLanguages(query: ListLanguagesQuery): Promise<{
    languages: ILanguage[];
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
    const [languages, total] = await Promise.all([
      Language.find(filter).sort({ priority: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Language.countDocuments(filter),
    ]);

    return {
      languages: languages as unknown as ILanguage[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List all active languages (for dropdown/selection)
   */
  async listActiveLanguages(): Promise<ILanguage[]> {
    const languages = await Language.find({ isActive: true }).sort({ priority: 1, name: 1 }).lean();
    return languages as unknown as ILanguage[];
  }

  /**
   * Update language by ID
   */
  async updateLanguage(languageId: string, data: AdminUpdateLanguageInput): Promise<ILanguage> {
    // Check if language exists
    const language = await Language.findById(languageId);
    if (!language) {
      throw new Error('Language not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== language.name) {
      const existing = await Language.findOne({ name: data.name });
      if (existing) {
        throw new Error(`Language with name "${data.name}" already exists`);
      }
    }

    // Update language
    Object.assign(language, data);
    await language.save();

    return language.toObject();
  }

  /**
   * Delete language by ID (soft delete - set isActive to false)
   */
  async deleteLanguage(languageId: string): Promise<void> {
    const language = await Language.findById(languageId);
    if (!language) {
      throw new Error('Language not found');
    }

    language.isActive = false;
    await language.save();
  }
}

export const languageService = new LanguageService();

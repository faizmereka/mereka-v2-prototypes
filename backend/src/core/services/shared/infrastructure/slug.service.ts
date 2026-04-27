import { type ISlug, type ResourceType, Slug } from '@core/models/Slug';

/**
 * Slug service - Manage slugs for all resources
 */
export class SlugService {
  /**
   * Check if slug is available
   * @param excludeResourceId - Optional resource ID to exclude from check (useful for updates)
   */
  async isSlugAvailable(
    slug: string,
    resourceType: ResourceType,
    excludeResourceId?: string,
  ): Promise<boolean> {
    const query: Record<string, unknown> = {
      'slugHistory.slug': slug.toLowerCase(),
      resourceType,
    };

    // Exclude the current resource when checking (for updates)
    if (excludeResourceId) {
      query.resourceId = { $ne: excludeResourceId };
    }

    const existing = await Slug.findOne(query);

    return !existing;
  }

  /**
   * Generate slug suggestions
   */
  generateSuggestions(slug: string): string[] {
    return [
      `${slug}123`,
      `${slug}_new`,
      `${slug}.${Math.floor(Math.random() * 1000)}`,
      `${slug}_${new Date().getFullYear()}`,
    ];
  }

  /**
   * Create initial slug for a resource
   */
  async createSlug(
    resourceId: string,
    resourceType: ResourceType,
    slug: string,
    userId: string,
  ): Promise<ISlug> {
    const slugDoc = await Slug.create({
      resourceType,
      resourceId,
      slugHistory: [
        {
          slug: slug.toLowerCase(),
          isActive: true,
          usedFrom: new Date(),
        },
      ],
      createdBy: userId,
      lastUpdatedBy: userId,
    });

    return slugDoc;
  }

  /**
   * Update slug (change to new slug) or create if doesn't exist
   */
  async updateSlug(
    resourceId: string,
    resourceType: ResourceType,
    newSlug: string,
    userId: string,
  ): Promise<ISlug> {
    const slugDoc = await Slug.findOne({ resourceId, resourceType });

    // If no slug document exists, create one
    if (!slugDoc) {
      return this.createSlug(resourceId, resourceType, newSlug, userId);
    }

    // Check if new slug is available (exclude current resource)
    const isAvailable = await this.isSlugAvailable(newSlug, resourceType, resourceId);
    if (!isAvailable) {
      throw new Error('Slug is already taken');
    }

    // Mark current slug as inactive
    slugDoc.slugHistory.forEach((entry) => {
      if (entry.isActive) {
        entry.isActive = false;
        entry.usedUntil = new Date();
      }
    });

    // Add new slug
    slugDoc.slugHistory.push({
      slug: newSlug.toLowerCase(),
      isActive: true,
      usedFrom: new Date(),
    });

    slugDoc.lastUpdatedBy = userId;
    await slugDoc.save();

    return slugDoc;
  }

  /**
   * Get current active slug
   */
  getCurrentSlug(slugDoc: ISlug): string | null {
    const activeSlug = slugDoc.slugHistory.find((entry) => entry.isActive);
    return activeSlug ? activeSlug.slug : null;
  }

  /**
   * Find resource by slug (with redirect support)
   */
  async findBySlug(
    slug: string,
    resourceType: ResourceType,
  ): Promise<{ slugDoc: ISlug; needsRedirect: boolean; currentSlug?: string } | null> {
    const slugDoc = await Slug.findOne({
      'slugHistory.slug': slug.toLowerCase(),
      resourceType,
    });

    if (!slugDoc) {
      return null;
    }

    const currentSlug = this.getCurrentSlug(slugDoc);
    const needsRedirect = currentSlug !== slug.toLowerCase();

    return {
      slugDoc,
      needsRedirect,
      currentSlug: currentSlug || undefined,
    };
  }
}

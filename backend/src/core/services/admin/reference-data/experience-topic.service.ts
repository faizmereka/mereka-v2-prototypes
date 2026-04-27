import { ExperienceTopic, type IExperienceTopic } from '@core/models/ExperienceTopic';
import type {
  AdminCreateExperienceTopicInput,
  AdminListExperienceTopicsQuery,
  AdminUpdateExperienceTopicInput,
} from '@schemas/admin';

/**
 * Experience Topic Service
 * Handles business logic for experience topics/subcategories
 */
export class ExperienceTopicService {
  /**
   * Create a new experience topic
   */
  async createTopic(data: AdminCreateExperienceTopicInput): Promise<IExperienceTopic> {
    // Check for duplicate topic name within the same parent category
    const existing = await ExperienceTopic.findOne({
      name: data.name,
      parentCategory: data.parentCategory,
    });
    if (existing) {
      throw new Error(`Topic with name "${data.name}" already exists in this theme`);
    }

    const topic = await ExperienceTopic.create(data);
    return topic.toObject();
  }

  /**
   * Get topic by ID
   */
  async getTopicById(topicId: string): Promise<IExperienceTopic | null> {
    const topic = await ExperienceTopic.findById(topicId).populate('parentCategory');
    return topic ? topic.toObject() : null;
  }

  /**
   * List all topics with optional filtering
   */
  async listTopics(query: AdminListExperienceTopicsQuery): Promise<{
    topics: IExperienceTopic[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { themeId, isActive, page = 1, limit = 100 } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (themeId) {
      filter.parentCategory = themeId;
    }
    if (isActive !== undefined) {
      // Handle both boolean and string "true"/"false" from query params
      filter.isActive = typeof isActive === 'string' ? isActive === 'true' : isActive;
    }

    // Execute queries in parallel
    const [topics, total] = await Promise.all([
      ExperienceTopic.find(filter)
        .sort({ priority: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .populate('parentCategory')
        .lean(),
      ExperienceTopic.countDocuments(filter),
    ]);

    return {
      topics: topics as unknown as IExperienceTopic[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List active topics for a specific theme (for dropdown/selection)
   */
  async listActiveTopicsByTheme(themeId: string): Promise<IExperienceTopic[]> {
    const topics = await ExperienceTopic.find({
      parentCategory: themeId,
      isActive: true,
    })
      .sort({ priority: 1, name: 1 })
      .lean();
    return topics as unknown as IExperienceTopic[];
  }

  /**
   * Update topic by ID
   */
  async updateTopic(
    topicId: string,
    data: AdminUpdateExperienceTopicInput,
  ): Promise<IExperienceTopic> {
    // Check if topic exists
    const topic = await ExperienceTopic.findById(topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Check for duplicate name if name or parent is being updated
    if (
      (data.name || data.parentCategory) &&
      (data.name !== topic.name || data.parentCategory !== topic.parentCategory.toString())
    ) {
      const existing = await ExperienceTopic.findOne({
        name: data.name || topic.name,
        parentCategory: data.parentCategory || topic.parentCategory,
      });
      if (existing && String(existing._id) !== topicId) {
        throw new Error(
          `Topic with name "${data.name || topic.name}" already exists in this theme`,
        );
      }
    }

    // Update topic
    Object.assign(topic, data);
    await topic.save();

    return topic.toObject();
  }

  /**
   * Delete topic by ID (soft delete - set isActive to false)
   */
  async deleteTopic(topicId: string): Promise<void> {
    const topic = await ExperienceTopic.findById(topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    topic.isActive = false;
    await topic.save();
  }
}

export const experienceTopicService = new ExperienceTopicService();

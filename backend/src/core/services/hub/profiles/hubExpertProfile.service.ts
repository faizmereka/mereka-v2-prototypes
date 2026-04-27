import { JobPreference } from '@core/models/JobPreference';
import { Skill } from '@core/models/Skill';
import { User } from '@core/models/User';
import type { HubUpdateExpertProfileInput } from '@schemas/hub';
import mongoose from 'mongoose';

/**
 * Expert Profile Service
 * Handles expert profile operations for expert onboarding
 */

/**
 * Get expert profile by user ID
 * Returns user with expert-specific fields populated
 */
export async function getExpertProfile(userId: string) {
  const user = await User.findById(userId)
    .populate('skills', 'name slug')
    .populate('focusAreaId', 'name slug icon')
    .populate('languages.languageId', 'name code')
    .populate('jobPreferences', 'name slug')
    .lean();

  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    username: user.username,
    profilePhoto: user.profilePhoto,
    coverPhoto: user.coverPhoto,
    bio: user.bio,
    phoneNumber: user.phoneNumber,
    location: user.location,
    socialLinks: user.socialLinks,
    professionalTitle: user.professionalTitle,
    introVideo: user.introVideo,
    skills: user.skills,
    focusAreaId: user.focusAreaId,
    languages: user.languages,
    portfolio: user.portfolio,
    employment: user.employment,
    education: user.education,
    hourlyRate: user.hourlyRate,
    jobPreferences: user.jobPreferences,
  };
}

/**
 * Update expert profile
 * Handles all expert onboarding fields
 */
export async function updateExpertProfile(userId: string, data: HubUpdateExpertProfileInput) {
  // Build update object
  const updateData: Record<string, unknown> = {};

  // Basic profile fields
  if (data.name !== undefined) updateData.name = data.name;
  if (data.profilePhoto !== undefined) updateData.profilePhoto = data.profilePhoto;
  if (data.coverPhoto !== undefined) updateData.coverPhoto = data.coverPhoto;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;

  // Username validation
  if (data.username !== undefined) {
    const normalizedUsername = data.username.toLowerCase().trim();
    const existingUser = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: userId },
    }).lean();

    if (existingUser) {
      throw new Error('Username is already taken');
    }
    updateData.username = normalizedUsername;
  }

  // Expert-specific fields
  if (data.professionalTitle !== undefined) updateData.professionalTitle = data.professionalTitle;
  if (data.introVideo !== undefined) updateData.introVideo = data.introVideo;
  if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;

  // Handle location
  if (data.location) {
    updateData.location = data.location;
  }

  // Handle socialLinks
  if (data.socialLinks) {
    updateData.socialLinks = data.socialLinks;
  }

  // Handle skills - convert names to ObjectIds if needed
  if (data.skills !== undefined) {
    updateData.skills = await resolveSkillIds(data.skills);
  }

  // Handle focusAreaId
  if (data.focusAreaId !== undefined) {
    updateData.focusAreaId = new mongoose.Types.ObjectId(data.focusAreaId);
  }

  // Handle languages - filter out invalid entries
  if (data.languages !== undefined) {
    const validLanguages = data.languages.filter(
      (lang) =>
        lang.languageId &&
        mongoose.Types.ObjectId.isValid(lang.languageId) &&
        lang.languageId.length === 24,
    );

    updateData.languages = validLanguages.map((lang) => ({
      languageId: new mongoose.Types.ObjectId(lang.languageId),
      proficiency: capitalizeFirst(lang.proficiency),
    }));
  }

  // Handle jobPreferences - convert names to ObjectIds if needed
  if (data.jobPreferences !== undefined) {
    updateData.jobPreferences = await resolveJobPreferenceIds(data.jobPreferences);
  }

  // Handle portfolio
  if (data.portfolio !== undefined) {
    updateData.portfolio = data.portfolio.map((item) => ({
      title: item.title,
      description: item.description,
      images: item.images,
      skills: item.skills, // Keep as strings for now
      year: item.year,
    }));
  }

  // Handle employment
  if (data.employment !== undefined) {
    updateData.employment = data.employment.map((item) => ({
      title: item.title,
      company: item.company,
      duration: item.duration || formatDuration(item.startDate, item.endDate, item.isOngoing),
      description: item.description,
    }));
  }

  // Handle education
  if (data.education !== undefined) {
    updateData.education = data.education.map((item) => ({
      degree: item.degree,
      institution: item.institution,
      year: item.year || item.endDate?.split('-')[0] || '',
    }));
  }

  return User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true })
    .populate('skills', 'name slug')
    .populate('focusAreaId', 'name slug icon')
    .populate('languages.languageId', 'name code')
    .populate('jobPreferences', 'name slug')
    .lean();
}

/**
 * Resolve skill names or IDs to ObjectIds
 */
async function resolveSkillIds(skills: string[]): Promise<mongoose.Types.ObjectId[]> {
  const objectIds: mongoose.Types.ObjectId[] = [];

  for (const skill of skills) {
    // Check if it's already a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(skill) && skill.length === 24) {
      objectIds.push(new mongoose.Types.ObjectId(skill));
    } else {
      // Try to find skill by name (case-insensitive)
      const foundSkill = await Skill.findOne({
        name: { $regex: new RegExp(`^${skill}$`, 'i') },
      }).lean();

      if (foundSkill) {
        objectIds.push(foundSkill._id as mongoose.Types.ObjectId);
      }
      // If not found, skip (or could create new skill)
    }
  }

  return objectIds;
}

/**
 * Resolve job preference names or IDs to ObjectIds
 */
async function resolveJobPreferenceIds(preferences: string[]): Promise<mongoose.Types.ObjectId[]> {
  const objectIds: mongoose.Types.ObjectId[] = [];

  for (const pref of preferences) {
    // Check if it's already a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(pref) && pref.length === 24) {
      objectIds.push(new mongoose.Types.ObjectId(pref));
    } else {
      // Try to find by name (case-insensitive)
      const found = await JobPreference.findOne({
        name: { $regex: new RegExp(`^${pref}$`, 'i') },
      }).lean();

      if (found) {
        objectIds.push(found._id as mongoose.Types.ObjectId);
      }
    }
  }

  return objectIds;
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format duration from start/end dates
 */
function formatDuration(startDate?: string, endDate?: string, isOngoing?: boolean): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const end = isOngoing ? new Date() : endDate ? new Date(endDate) : new Date();

  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
}

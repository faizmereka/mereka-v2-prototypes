import { User } from '../../../models/User';

/**
 * User Profile Service
 * Handles user profile operations for learner onboarding
 */

export interface UpdateLearnerProfileDto {
  name?: string;
  username?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  phoneNumber?: string;
  bio?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface CheckUsernameResult {
  available: boolean;
  username: string;
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string,
): Promise<CheckUsernameResult> {
  // Normalize username (lowercase, trim)
  const normalizedUsername = username.toLowerCase().trim();

  // Build query
  const query: Record<string, unknown> = { username: normalizedUsername };

  // Exclude current user if provided (for update scenarios)
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existingUser = await User.findOne(query).lean();

  return {
    available: !existingUser,
    username: normalizedUsername,
  };
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  return User.findById(userId).lean();
}

/**
 * Update learner profile
 */
export async function updateLearnerProfile(userId: string, data: UpdateLearnerProfileDto) {
  // If username is being updated, validate it first
  if (data.username) {
    const usernameCheck = await checkUsernameAvailability(data.username, userId);
    if (!usernameCheck.available) {
      throw new Error('Username is already taken');
    }
    // Use normalized username
    data.username = usernameCheck.username;
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.profilePhoto !== undefined) updateData.profilePhoto = data.profilePhoto;
  if (data.coverPhoto !== undefined) updateData.coverPhoto = data.coverPhoto;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.bio !== undefined) updateData.bio = data.bio;

  // Handle nested location object
  if (data.location) {
    if (data.location.city !== undefined) updateData['location.city'] = data.location.city;
    if (data.location.country !== undefined) updateData['location.country'] = data.location.country;
    if (data.location.lat !== undefined) updateData['location.lat'] = data.location.lat;
    if (data.location.lng !== undefined) updateData['location.lng'] = data.location.lng;
  }

  // Handle nested socialLinks object
  if (data.socialLinks) {
    if (data.socialLinks.website !== undefined)
      updateData['socialLinks.website'] = data.socialLinks.website;
    if (data.socialLinks.facebook !== undefined)
      updateData['socialLinks.facebook'] = data.socialLinks.facebook;
    if (data.socialLinks.instagram !== undefined)
      updateData['socialLinks.instagram'] = data.socialLinks.instagram;
    if (data.socialLinks.twitter !== undefined)
      updateData['socialLinks.twitter'] = data.socialLinks.twitter;
    if (data.socialLinks.linkedin !== undefined)
      updateData['socialLinks.linkedin'] = data.socialLinks.linkedin;
  }

  return User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
}

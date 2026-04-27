import { Hub, type IHub } from '@core/models/Hub';
import { HubMember } from '@core/models/HubMember';
import type { HubUpdateSettingsProfileInput } from '@core/schemas/hub/settings';
import type { FlattenMaps } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface HubSettingsProfile {
  id: string;
  name: string;
  description: string;
  email: string;
  phoneNumber: string;
  website: string;
  address: string;
  logo: string;
  coverImage: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get hub settings profile for the current user
 */
export async function getHubSettingsProfile(
  userId: string,
  hubId?: string,
): Promise<HubSettingsProfile> {
  let hub: FlattenMaps<IHub> | null = null;

  if (hubId) {
    // Verify user has access to this hub
    const membership = await HubMember.findOne({
      hubId,
      userId,
      status: 'active',
    }).lean();

    if (!membership) {
      // Check if user is hub owner
      hub = await Hub.findOne({ _id: hubId, ownerId: userId }).lean();
      if (!hub) {
        throw new Error('Hub not found or access denied');
      }
    } else {
      hub = await Hub.findById(hubId).lean();
    }
  } else {
    // Get user's primary hub (as owner)
    hub = await Hub.findOne({ ownerId: userId }).lean();
    if (!hub) {
      throw new Error('No hub found for this user');
    }
  }

  if (!hub) {
    throw new Error('Hub not found');
  }

  return {
    id: hub._id.toString(),
    name: hub.name || '',
    description: hub.description || '',
    email: hub.socialLinks?.email || '',
    phoneNumber: hub.phoneNumber || '',
    website: hub.socialLinks?.website || '',
    address: hub.location?.address || '',
    logo: hub.logo || '',
    coverImage: hub.coverImage || '',
  };
}

/**
 * Update hub settings profile
 */
export async function updateHubSettingsProfile(
  userId: string,
  input: HubUpdateSettingsProfileInput,
): Promise<HubSettingsProfile> {
  const { hubId, name, description, email, phoneNumber, website, address, logo, coverImage } =
    input;

  let hub: IHub | null = null;

  if (hubId) {
    // Verify user has access to this hub with edit permissions
    const membership = await HubMember.findOne({
      hubId,
      userId,
      status: 'active',
    }).lean();

    if (!membership) {
      // Check if user is hub owner
      hub = await Hub.findOne({ _id: hubId, ownerId: userId });
      if (!hub) {
        throw new Error('Hub not found or access denied');
      }
    } else {
      // Check if member has permission to edit profile
      // For now, allow any active member to update profile
      hub = await Hub.findById(hubId);
    }
  } else {
    // Get user's primary hub (as owner)
    hub = await Hub.findOne({ ownerId: userId });
    if (!hub) {
      throw new Error('No hub found for this user');
    }
  }

  if (!hub) {
    throw new Error('Hub not found');
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    lastUpdatedBy: userId,
  };

  if (name !== undefined) {
    updateData.name = name;
  }

  if (description !== undefined) {
    updateData.description = description;
  }

  if (phoneNumber !== undefined) {
    updateData.phoneNumber = phoneNumber;
  }

  if (logo !== undefined) {
    updateData.logo = logo;
  }

  if (coverImage !== undefined) {
    updateData.coverImage = coverImage;
  }

  // Handle socialLinks updates
  if (email !== undefined || website !== undefined) {
    const socialLinks = hub.socialLinks || {};
    if (email !== undefined) {
      socialLinks.email = email;
    }
    if (website !== undefined) {
      socialLinks.website = website;
    }
    updateData.socialLinks = socialLinks;
  }

  // Handle location.address update
  if (address !== undefined) {
    const location = hub.location || { city: '', country: '' };
    location.address = address;
    updateData.location = location;
  }

  // Update hub
  const updatedHub = await Hub.findByIdAndUpdate(
    hub._id,
    { $set: updateData },
    { new: true },
  ).lean();

  if (!updatedHub) {
    throw new Error('Failed to update hub');
  }

  return {
    id: updatedHub._id.toString(),
    name: updatedHub.name || '',
    description: updatedHub.description || '',
    email: updatedHub.socialLinks?.email || '',
    phoneNumber: updatedHub.phoneNumber || '',
    website: updatedHub.socialLinks?.website || '',
    address: updatedHub.location?.address || '',
    logo: updatedHub.logo || '',
    coverImage: updatedHub.coverImage || '',
  };
}

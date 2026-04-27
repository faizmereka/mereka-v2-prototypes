/**
 * Slug Generator Utility
 * Handles slug generation and validation for experiences
 */

/**
 * Generate a URL-friendly slug from a title
 * @param title - The experience title
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Validate slug format
 * @param slug - The slug to validate
 * @returns true if valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false;

  // Must be lowercase, alphanumeric with hyphens only
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Sanitize user-entered slug
 * @param slug - User-entered slug
 * @returns Sanitized slug
 */
export function sanitizeSlug(slug: string): string {
  if (!slug) return '';

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '') // Only allow lowercase letters, numbers, hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50);
}

/**
 * Generate unique slug with suffix if needed
 * @param baseSlug - The base slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Build full experience URL
 * @param slug - Experience slug
 * @param baseUrl - Base URL (defaults to mereka.io)
 * @returns Full experience URL
 */
export function buildExperienceUrl(slug: string, baseUrl = 'https://mereka.io'): string {
  return `${baseUrl}/experience/${slug}`;
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

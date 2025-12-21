/**
 * Utility functions for handling display names
 */

// Regex to match most emojis and special Unicode characters
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu;

/**
 * Strips emojis and special characters from a string
 */
export function stripEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '').trim();
}

/**
 * Gets initials from a name, stripping emojis first
 */
export function getInitials(name: string): string {
  // First strip emojis
  const cleanName = stripEmojis(name).trim();
  
  if (!cleanName) {
    return "??";
  }
  
  const parts = cleanName.split(/\s+/).filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  
  // Single word - take first 2 characters
  return cleanName.substring(0, 2).toUpperCase();
}

/**
 * Checks if a string contains emojis
 */
export function containsEmoji(text: string): boolean {
  return EMOJI_REGEX.test(text);
}

/**
 * Validates a display name
 * Returns an error message if invalid, null if valid
 */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return "Display name is required";
  }
  
  if (trimmed.length < 2) {
    return "Display name must be at least 2 characters";
  }
  
  if (trimmed.length > 30) {
    return "Display name must be 30 characters or less";
  }
  
  if (containsEmoji(trimmed)) {
    return "Display name cannot contain emojis";
  }
  
  // Only allow letters, numbers, spaces, hyphens, apostrophes, and periods
  const validNameRegex = /^[a-zA-Z0-9\s\-'.]+$/;
  if (!validNameRegex.test(trimmed)) {
    return "Display name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods";
  }
  
  return null;
}

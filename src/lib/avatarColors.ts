/**
 * Hash-based avatar fallback colors
 * Colors are designed to harmonize with the app's primary green (#22C55E / hsl(142, 71%, 45%))
 */

// Green-compatible palette with similar saturation and lightness
const AVATAR_COLORS = [
  'hsl(142, 50%, 40%)',  // Emerald (primary family)
  'hsl(175, 55%, 42%)',  // Teal
  'hsl(195, 55%, 45%)',  // Cyan
  'hsl(160, 50%, 38%)',  // Jade
  'hsl(130, 40%, 42%)',  // Sage
  'hsl(85, 45%, 40%)',   // Olive
  'hsl(110, 45%, 38%)',  // Moss
  'hsl(210, 35%, 45%)',  // Slate blue
];

/**
 * Simple string hash function
 * Converts a string to a consistent numeric hash
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a given name/identifier
 * The same name will always return the same color
 */
export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  const hash = hashString(name.toLowerCase().trim());
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export { AVATAR_COLORS };

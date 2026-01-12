/**
 * Hash-based avatar fallback colors
 * Earth-tones + green palette from Coolors, harmonizing with primary green (#22C55E)
 */

// 8 distinct colors - repeats only occur when >8 users lack avatars
const AVATAR_COLORS = [
  '#F28123',  // Vivid Tangerine
  '#D34E24',  // Spicy Orange
  '#22C55E',  // Jade Green (primary)
  '#563F1B',  // Deep Walnut
  '#38726C',  // Pine Blue
  '#C9A227',  // Goldenrod
  '#2D8B70',  // Sea Green
  '#8B4513',  // Saddle Brown
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

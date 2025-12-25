/**
 * Pure functions for pick reveal logic.
 * Extracted for testability.
 */

export interface UserSlotInfo {
  userId: string;
  slots: Set<string>;
}

export interface PickRevealResult {
  currentUserSubmitted: boolean;
  pastDeadline: boolean;
  submittedUserIds: string[];
}

/**
 * Required slots for a complete submission
 */
export const REQUIRED_SLOTS = ['QB', 'RB', 'FLEX'] as const;

/**
 * Determines if a week is a playoff week (1-4) vs regular season (14-17)
 */
export function isPlayoffWeek(week: number): boolean {
  return week >= 1 && week <= 4;
}

/**
 * Determines if a week is a regular season week (14-18)
 */
export function isRegularSeasonWeek(week: number): boolean {
  return week >= 14 && week <= 18;
}

/**
 * Checks if a user has submitted complete picks (all required slots)
 */
export function hasCompleteSubmission(slots: Set<string>): boolean {
  return REQUIRED_SLOTS.every(slot => slots.has(slot));
}

/**
 * Groups picks by user and tracks which slots each user has filled
 */
export function groupPicksByUser(
  picks: Array<{ auth_user_id: string | null; position_slot: string }>
): Map<string, Set<string>> {
  const userSlots = new Map<string, Set<string>>();

  picks.forEach((pick) => {
    const userId = pick.auth_user_id;
    if (!userId) return;

    if (!userSlots.has(userId)) {
      userSlots.set(userId, new Set());
    }
    userSlots.get(userId)?.add(pick.position_slot);
  });

  return userSlots;
}

/**
 * Finds all users who have submitted complete picks
 */
export function getSubmittedUserIds(userSlots: Map<string, Set<string>>): string[] {
  const submittedUserIds: string[] = [];

  userSlots.forEach((slots, userId) => {
    if (hasCompleteSubmission(slots)) {
      submittedUserIds.push(userId);
    }
  });

  return submittedUserIds;
}

/**
 * Determines if it's past the deadline (first game kickoff)
 */
export function isPastDeadline(now: Date, firstGameKickoff: string | null): boolean {
  if (!firstGameKickoff) return false;
  return now >= new Date(firstGameKickoff);
}

/**
 * Determines if a user can view other users' picks
 *
 * Rules:
 * - If user has submitted their picks: can view picks from other submitted users
 * - If past deadline: can view all picks
 * - Otherwise: cannot view picks
 */
export function canViewPicks(
  currentUserSubmitted: boolean,
  pastDeadline: boolean
): boolean {
  return currentUserSubmitted || pastDeadline;
}

/**
 * Filters picks based on reveal status
 *
 * - If past deadline: show all picks
 * - If before deadline: only show picks from submitted users
 */
export function filterPicksByRevealStatus<T extends { auth_user_id: string | null }>(
  picks: T[],
  submittedUserIds: string[],
  pastDeadline: boolean
): T[] {
  if (pastDeadline) {
    return picks;
  }

  return picks.filter(pick =>
    pick.auth_user_id && submittedUserIds.includes(pick.auth_user_id)
  );
}

/**
 * Main function to calculate pick reveal status
 */
export function calculatePickRevealStatus(
  picks: Array<{ auth_user_id: string | null; position_slot: string }>,
  currentUserId: string,
  firstGameKickoff: string | null,
  now: Date = new Date()
): PickRevealResult {
  const userSlots = groupPicksByUser(picks);
  const submittedUserIds = getSubmittedUserIds(userSlots);
  const currentUserSlots = userSlots.get(currentUserId) || new Set();
  const currentUserSubmitted = hasCompleteSubmission(currentUserSlots);
  const pastDeadline = isPastDeadline(now, firstGameKickoff);

  return {
    currentUserSubmitted,
    pastDeadline,
    submittedUserIds,
  };
}

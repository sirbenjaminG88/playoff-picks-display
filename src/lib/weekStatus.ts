import { Week, Pick } from "@/domain/types";
import { isWindowOpen, isDeadlinePassed } from "@/lib/timezone";

export type WeekStatus =
  | "FUTURE_LOCKED"        // future week, not open yet
  | "OPEN_NOT_SUBMITTED"   // current week, user can still make picks
  | "SUBMITTED"            // user submitted picks, cannot change
  | "PAST_NO_PICKS";       // week is over, user never submitted

/**
 * Determine the status of a week for a user.
 * All time comparisons use Eastern Time as the source of truth.
 * @param args.week - The week configuration
 * @param args.userPicksForWeek - User's picks for this week
 * @param args.now - Current time (defaults to now, but can be overridden for testing)
 */
export function getWeekStatus(args: {
  week: Week;
  userPicksForWeek: Pick[];
  now?: Date;
}): WeekStatus {
  const { week, userPicksForWeek, now } = args;
  const currentTime = now ?? new Date();
  const hasPicks = userPicksForWeek.length > 0;

  // Once a user submits, their week is effectively "submitted" and read-only
  if (hasPicks) {
    return "SUBMITTED";
  }

  // Check if we're within the open window (uses UTC comparison which works correctly)
  if (isWindowOpen(week.openAt, week.deadlineAt, currentTime)) {
    return "OPEN_NOT_SUBMITTED";
  }

  // Check if we're before the open window
  const openAt = new Date(week.openAt);
  if (currentTime < openAt) {
    return "FUTURE_LOCKED";
  }

  // now > deadline and no picks
  return "PAST_NO_PICKS";
}

/**
 * Find the current open week (if any).
 * Uses Eastern Time for all comparisons.
 */
export function getCurrentOpenWeek(weeks: Week[], now: Date = new Date()): Week | null {
  return weeks.find((w) => isWindowOpen(w.openAt, w.deadlineAt, now)) ?? null;
}

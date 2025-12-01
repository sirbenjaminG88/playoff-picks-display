import { Week, Pick } from "@/domain/types";

export type WeekStatus =
  | "FUTURE_LOCKED"        // future week, not open yet
  | "OPEN_NOT_SUBMITTED"   // current week, user can still make picks
  | "SUBMITTED"            // user submitted picks, cannot change
  | "PAST_NO_PICKS";       // week is over, user never submitted

export function getWeekStatus(args: {
  week: Week;
  userPicksForWeek: Pick[];    // QB/RB/FLEX for that user+week
  now: Date;
}): WeekStatus {
  const { week, userPicksForWeek, now } = args;
  const openAt = new Date(week.openAt);
  const deadlineAt = new Date(week.deadlineAt);
  const hasPicks = userPicksForWeek.length > 0;

  // Once a user submits, their week is effectively "submitted" and read-only,
  // even if we haven't hit the global deadline yet.
  if (hasPicks) {
    return "SUBMITTED";
  }

  if (now < openAt) {
    return "FUTURE_LOCKED";
  }

  if (now >= openAt && now <= deadlineAt) {
    return "OPEN_NOT_SUBMITTED";
  }

  // now > deadline and no picks
  return "PAST_NO_PICKS";
}

export function getCurrentOpenWeek(weeks: Week[], now: Date = new Date()): Week | null {
  // Find the first week that would be "open" if user hasn't submitted
  return weeks.find((w) => {
    const openAt = new Date(w.openAt);
    const deadlineAt = new Date(w.deadlineAt);
    return now >= openAt && now <= deadlineAt;
  }) ?? null;
}

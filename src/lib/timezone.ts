import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

// All app times use Eastern Time as the source of truth
const TIMEZONE = "America/New_York";

/**
 * Get the current time in Eastern Time
 */
export function getNowInET(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Convert a UTC date/timestamp to Eastern Time
 * @param utcDate - Date object, ISO string, or timestamp
 */
export function toET(utcDate: Date | string | number): Date {
  const date = typeof utcDate === "string" || typeof utcDate === "number" 
    ? new Date(utcDate) 
    : utcDate;
  return toZonedTime(date, TIMEZONE);
}

/**
 * Format a game date/time in Eastern Time
 * @param utcDate - UTC date string or Date object from the database
 * @returns Formatted string like "Sun Dec 7, 1:00 PM ET"
 */
export function formatGameDateET(utcDate: Date | string | null | undefined): string {
  if (!utcDate) return "TBD";
  
  try {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    return formatInTimeZone(date, TIMEZONE, "EEE MMM d, h:mm a") + " ET";
  } catch {
    return "TBD";
  }
}

/**
 * Format a game date/time in Eastern Time (short format)
 * @param utcDate - UTC date string or Date object from the database
 * @returns Formatted string like "Dec 7, 1:00 PM ET"
 */
export function formatGameDateShortET(utcDate: Date | string | null | undefined): string {
  if (!utcDate) return "TBD";
  
  try {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    return formatInTimeZone(date, TIMEZONE, "MMM d, h:mm a") + " ET";
  } catch {
    return "TBD";
  }
}

/**
 * Format just the time in Eastern Time
 * @param utcDate - UTC date string or Date object from the database
 * @returns Formatted string like "1:00 PM ET"
 */
export function formatTimeET(utcDate: Date | string | null | undefined): string {
  if (!utcDate) return "TBD";
  
  try {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    return formatInTimeZone(date, TIMEZONE, "h:mm a") + " ET";
  } catch {
    return "TBD";
  }
}

/**
 * Format just the date in Eastern Time
 * @param utcDate - UTC date string or Date object from the database
 * @returns Formatted string like "Sun Dec 7"
 */
export function formatDateOnlyET(utcDate: Date | string | null | undefined): string {
  if (!utcDate) return "TBD";
  
  try {
    const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    return formatInTimeZone(date, TIMEZONE, "EEE MMM d");
  } catch {
    return "TBD";
  }
}

/**
 * Check if a deadline has passed (comparing in ET)
 * @param deadlineUtc - UTC deadline timestamp
 * @param nowOverride - Optional override for current time (for testing)
 */
export function isDeadlinePassed(
  deadlineUtc: Date | string, 
  nowOverride?: Date
): boolean {
  const deadline = typeof deadlineUtc === "string" ? new Date(deadlineUtc) : deadlineUtc;
  const now = nowOverride ?? new Date();
  return now > deadline;
}

/**
 * Check if a time window is currently open (comparing in ET)
 * @param openAtUtc - UTC open timestamp
 * @param deadlineUtc - UTC deadline timestamp  
 * @param nowOverride - Optional override for current time (for testing)
 */
export function isWindowOpen(
  openAtUtc: Date | string,
  deadlineUtc: Date | string,
  nowOverride?: Date
): boolean {
  const openAt = typeof openAtUtc === "string" ? new Date(openAtUtc) : openAtUtc;
  const deadline = typeof deadlineUtc === "string" ? new Date(deadlineUtc) : deadlineUtc;
  const now = nowOverride ?? new Date();
  return now >= openAt && now <= deadline;
}

/**
 * Format a deadline for display
 * @param deadlineUtc - UTC deadline timestamp
 * @returns String like "Picks lock Sun Dec 7, 1:00 PM ET"
 */
export function formatDeadlineET(deadlineUtc: Date | string | null | undefined): string {
  if (!deadlineUtc) return "";
  return `Picks lock ${formatGameDateET(deadlineUtc)}`;
}

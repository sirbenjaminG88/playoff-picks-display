import { Week } from "@/domain/types";

export type WeekStatus = "future" | "open" | "locked";

export function getWeekStatus(week: Week, now: Date = new Date()): WeekStatus {
  const openAt = new Date(week.openAt).getTime();
  const deadlineAt = new Date(week.deadlineAt).getTime();
  const current = now.getTime();

  if (current < openAt) return "future";
  if (current >= deadlineAt) return "locked";
  return "open";
}

export function getCurrentOpenWeek(weeks: Week[], now: Date = new Date()): Week | null {
  return weeks.find((w) => getWeekStatus(w, now) === "open") ?? null;
}

import { Week } from "@/domain/types";

// All openAt times are noon EST (17:00 UTC)
// Deadlines are first game kickoff (approx 1pm EST = 18:00 UTC)
export const playoffWeeks: Week[] = [
  {
    id: "week1",
    season: 2025,
    weekNumber: 1,
    openAt: "2026-01-06T17:00:00Z", // Mon Jan 6, noon EST
    deadlineAt: "2026-01-10T18:00:00Z", // Wild Card Sat Jan 10
  },
  {
    id: "week2",
    season: 2025,
    weekNumber: 2,
    openAt: "2026-01-13T17:00:00Z", // Mon Jan 13, noon EST
    deadlineAt: "2026-01-17T18:00:00Z", // Divisional Sat Jan 17
  },
  {
    id: "week3",
    season: 2025,
    weekNumber: 3,
    openAt: "2026-01-20T17:00:00Z", // Mon Jan 20, noon EST
    deadlineAt: "2026-01-25T18:00:00Z", // Conference Champ Sun Jan 25
  },
  {
    id: "week4",
    season: 2025,
    weekNumber: 4,
    openAt: "2026-01-27T17:00:00Z", // Mon Jan 27, noon EST
    deadlineAt: "2026-02-08T18:00:00Z", // Super Bowl LX Sun Feb 8
  },
];

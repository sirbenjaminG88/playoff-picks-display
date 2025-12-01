import { Week } from "@/domain/types";

export const playoffWeeks: Week[] = [
  {
    id: "week1",
    season: 2024,
    weekNumber: 1,
    openAt: "2025-01-10T12:00:00Z",
    deadlineAt: "2025-01-11T18:00:00Z", // first game kickoff
  },
  {
    id: "week2",
    season: 2024,
    weekNumber: 2,
    openAt: "2025-01-18T12:00:00Z", // day after week 1 finishes
    deadlineAt: "2025-01-19T18:00:00Z",
  },
  {
    id: "week3",
    season: 2024,
    weekNumber: 3,
    openAt: "2025-01-25T12:00:00Z",
    deadlineAt: "2025-01-26T18:00:00Z",
  },
  {
    id: "week4",
    season: 2024,
    weekNumber: 4,
    openAt: "2025-02-01T12:00:00Z",
    deadlineAt: "2025-02-02T18:00:00Z",
  },
];

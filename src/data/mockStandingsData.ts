// Mock data for testing the Results page structure

export interface MockWeeklyPick {
  userId: string;
  userName: string;
  qb: string;
  rb: string;
  flex: string;
  weekPoints: number;
}

export interface MockWeekStandings {
  weekNumber: number;
  picks: MockWeeklyPick[];
}

export const mockStandingsData: MockWeekStandings[] = [
  {
    weekNumber: 1,
    picks: [
      {
        userId: "user-1",
        userName: "Alex",
        qb: "Jalen Hurts",
        rb: "Saquon Barkley",
        flex: "A.J. Brown",
        weekPoints: 84.3,
      },
      {
        userId: "user-2",
        userName: "Jordan",
        qb: "Josh Allen",
        rb: "Christian McCaffrey",
        flex: "Travis Kelce",
        weekPoints: 71.5,
      },
      {
        userId: "user-3",
        userName: "Taylor",
        qb: "Patrick Mahomes",
        rb: "David Montgomery",
        flex: "George Kittle",
        weekPoints: 68.2,
      },
      {
        userId: "user-4",
        userName: "Sam",
        qb: "Lamar Jackson",
        rb: "Derrick Henry",
        flex: "Mark Andrews",
        weekPoints: 59.8,
      },
    ],
  },
  {
    weekNumber: 2,
    picks: [
      {
        userId: "user-1",
        userName: "Alex",
        qb: "Josh Allen",
        rb: "James Cook",
        flex: "Stefon Diggs",
        weekPoints: 0,
      },
      {
        userId: "user-2",
        userName: "Jordan",
        qb: "Jalen Hurts",
        rb: "D'Andre Swift",
        flex: "Dallas Goedert",
        weekPoints: 0,
      },
      {
        userId: "user-3",
        userName: "Taylor",
        qb: "Lamar Jackson",
        rb: "Gus Edwards",
        flex: "Zay Flowers",
        weekPoints: 0,
      },
      {
        userId: "user-4",
        userName: "Sam",
        qb: "Jordan Love",
        rb: "Josh Jacobs",
        flex: "Jayden Reed",
        weekPoints: 0,
      },
    ],
  },
  {
    weekNumber: 3,
    picks: [
      {
        userId: "user-1",
        userName: "Alex",
        qb: "Patrick Mahomes",
        rb: "Isiah Pacheco",
        flex: "Travis Kelce",
        weekPoints: 0,
      },
      {
        userId: "user-2",
        userName: "Jordan",
        qb: "Jordan Love",
        rb: "Aaron Jones",
        flex: "Christian Watson",
        weekPoints: 0,
      },
      {
        userId: "user-3",
        userName: "Taylor",
        qb: "Josh Allen",
        rb: "James Cook",
        flex: "Dalton Kincaid",
        weekPoints: 0,
      },
      {
        userId: "user-4",
        userName: "Sam",
        qb: "Brock Purdy",
        rb: "Christian McCaffrey",
        flex: "Brandon Aiyuk",
        weekPoints: 0,
      },
    ],
  },
  {
    weekNumber: 4,
    picks: [
      {
        userId: "user-1",
        userName: "Alex",
        qb: "Lamar Jackson",
        rb: "Derrick Henry",
        flex: "Mark Andrews",
        weekPoints: 0,
      },
      {
        userId: "user-2",
        userName: "Jordan",
        qb: "Patrick Mahomes",
        rb: "Isiah Pacheco",
        flex: "Rashee Rice",
        weekPoints: 0,
      },
      {
        userId: "user-3",
        userName: "Taylor",
        qb: "Jalen Hurts",
        rb: "D'Andre Swift",
        flex: "A.J. Brown",
        weekPoints: 0,
      },
      {
        userId: "user-4",
        userName: "Sam",
        qb: "Josh Allen",
        rb: "James Cook",
        flex: "Stefon Diggs",
        weekPoints: 0,
      },
    ],
  },
];

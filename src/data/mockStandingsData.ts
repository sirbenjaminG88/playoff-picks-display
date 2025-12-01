// Mock data for testing the Results page structure

export interface PlayerStats {
  passYards?: number;
  passTDs?: number;
  interceptions?: number;
  rushYards?: number;
  rushTDs?: number;
  recYards?: number;
  recTDs?: number;
  fumblesLost?: number;
  twoPtConversions?: number;
}

export interface PlayerResult {
  name: string;
  team: string;
  position: "QB" | "RB" | "WR" | "TE";
  points: number;
  selectedBy: string[];
  stats: PlayerStats;
}

export interface WeekResults {
  weekNumber: number;
  qbs: PlayerResult[];
  rbs: PlayerResult[];
  flex: PlayerResult[];
}

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

export const mockWeekResults: WeekResults[] = [
  {
    weekNumber: 1,
    qbs: [
      {
        name: "Jalen Hurts",
        team: "PHI",
        position: "QB",
        points: 28.5,
        selectedBy: ["Alex", "Jordan"],
        stats: {
          passYards: 250,
          passTDs: 2,
          rushYards: 65,
          rushTDs: 1,
          interceptions: 0,
        },
      },
      {
        name: "Josh Allen",
        team: "BUF",
        position: "QB",
        points: 24.8,
        selectedBy: ["Taylor"],
        stats: {
          passYards: 280,
          passTDs: 2,
          rushYards: 38,
          rushTDs: 0,
          interceptions: 1,
        },
      },
      {
        name: "Patrick Mahomes",
        team: "KC",
        position: "QB",
        points: 22.4,
        selectedBy: ["Sam"],
        stats: {
          passYards: 320,
          passTDs: 2,
          rushYards: 12,
          rushTDs: 0,
          interceptions: 0,
        },
      },
    ],
    rbs: [
      {
        name: "Saquon Barkley",
        team: "PHI",
        position: "RB",
        points: 31.2,
        selectedBy: ["Alex", "Sam", "Taylor"],
        stats: {
          rushYards: 156,
          rushTDs: 2,
          recYards: 36,
          recTDs: 0,
        },
      },
      {
        name: "Christian McCaffrey",
        team: "SF",
        position: "RB",
        points: 26.8,
        selectedBy: ["Jordan"],
        stats: {
          rushYards: 98,
          rushTDs: 1,
          recYards: 72,
          recTDs: 1,
        },
      },
    ],
    flex: [
      {
        name: "George Kittle",
        team: "SF",
        position: "TE",
        points: 27.4,
        selectedBy: ["Taylor", "Jordan"],
        stats: {
          recYards: 134,
          recTDs: 1,
        },
      },
      {
        name: "A.J. Brown",
        team: "PHI",
        position: "WR",
        points: 24.6,
        selectedBy: ["Alex"],
        stats: {
          recYards: 126,
          recTDs: 1,
          rushYards: 0,
          rushTDs: 0,
        },
      },
      {
        name: "Mark Andrews",
        team: "BAL",
        position: "TE",
        points: 22.4,
        selectedBy: ["Sam"],
        stats: {
          recYards: 104,
          recTDs: 1,
        },
      },
    ],
  },
];

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

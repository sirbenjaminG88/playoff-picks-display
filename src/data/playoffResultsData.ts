export type PlayerStats = {
  passYards?: number | null;
  passTDs?: number | null;
  rushYards?: number | null;
  recYards?: number | null;
  rushTDs?: number | null;
  recTDs?: number | null;
  fumblesLost?: number | null;
  interceptions?: number | null;
  twoPtConversions?: number | null;
};

export type PlayerSelection = {
  name: string;
  team: string;
  position: "QB" | "RB" | "WR" | "TE";
  selectedBy: string[];
  points?: number | null;
  stats?: PlayerStats;
};

export type WeekResults = {
  qbs: PlayerSelection[];
  rbs: PlayerSelection[];
  flex: PlayerSelection[]; // WR/TE
};

// Raw picks data for transformation
const rawWeek1 = [
  { user: "Jasper", qb: "Josh Allen", qbTeam: "BUF", rb: "Saquon Barkley", rbTeam: "PHI", flex: "Justin Jefferson", flexTeam: "MIN", flexPos: "WR" as const },
  { user: "Jeremy", qb: "Lamar Jackson", qbTeam: "BAL", rb: "Saquon Barkley", rbTeam: "PHI", flex: "Justin Jefferson", flexTeam: "MIN", flexPos: "WR" as const },
  { user: "Eric", qb: "Lamar Jackson", qbTeam: "BAL", rb: "Saquon Barkley", rbTeam: "PHI", flex: "Puka Nacua", flexTeam: "LAR", flexPos: "WR" as const },
  { user: "Ben", qb: "Baker Mayfield", qbTeam: "TB", rb: "Kyren Williams", rbTeam: "LAR", flex: "Justin Jefferson", flexTeam: "MIN", flexPos: "WR" as const },
];

const rawWeek2 = [
  { user: "Jasper", qb: "Lamar Jackson", qbTeam: "BAL", rb: "Derrick Henry", rbTeam: "BAL", flex: "Amon-Ra St. Brown", flexTeam: "DET", flexPos: "WR" as const },
  { user: "Jeremy", qb: "Josh Allen", qbTeam: "BUF", rb: "Jahmyr Gibbs", rbTeam: "DET", flex: "Puka Nacua", flexTeam: "LAR", flexPos: "WR" as const },
  { user: "Eric", qb: "Josh Allen", qbTeam: "BUF", rb: "Jahmyr Gibbs", rbTeam: "DET", flex: "Amon-Ra St. Brown", flexTeam: "DET", flexPos: "WR" as const },
  { user: "Ben", qb: "Josh Allen", qbTeam: "BUF", rb: "Derrick Henry", rbTeam: "BAL", flex: "Nico Collins", flexTeam: "HOU", flexPos: "WR" as const },
];

const rawWeek3 = [
  { user: "Jasper", qb: "Patrick Mahomes", qbTeam: "KC", rb: "Brian Robinson Jr.", rbTeam: "WAS", flex: "Terry McLaurin", flexTeam: "WAS", flexPos: "WR" as const },
  { user: "Jeremy", qb: "Patrick Mahomes", qbTeam: "KC", rb: "Austin Ekeler", rbTeam: "WAS", flex: "Travis Kelce", flexTeam: "KC", flexPos: "TE" as const },
  { user: "Eric", qb: "Patrick Mahomes", qbTeam: "KC", rb: "Brian Robinson Jr.", rbTeam: "WAS", flex: "A.J. Brown", flexTeam: "PHI", flexPos: "WR" as const },
  { user: "Ben", qb: "Patrick Mahomes", qbTeam: "KC", rb: "Saquon Barkley", rbTeam: "PHI", flex: "Terry McLaurin", flexTeam: "WAS", flexPos: "WR" as const },
];

const rawWeek4 = [
  { user: "Jasper", qb: "Jalen Hurts", qbTeam: "PHI", rb: "Isiah Pacheco", rbTeam: "KC", flex: "Xavier Worthy", flexTeam: "KC", flexPos: "WR" as const },
  { user: "Jeremy", qb: "Jalen Hurts", qbTeam: "PHI", rb: "Kareem Hunt", rbTeam: "KC", flex: "Xavier Worthy", flexTeam: "KC", flexPos: "WR" as const },
  { user: "Eric", qb: "Jalen Hurts", qbTeam: "PHI", rb: "Kareem Hunt", rbTeam: "KC", flex: "Xavier Worthy", flexTeam: "KC", flexPos: "WR" as const },
  { user: "Ben", qb: "Jalen Hurts", qbTeam: "PHI", rb: "Kareem Hunt", rbTeam: "KC", flex: "A.J. Brown", flexTeam: "PHI", flexPos: "WR" as const },
];

// Helper function to transform raw picks into WeekResults
function transformWeekPicks(rawPicks: Array<{
  user: string;
  qb: string;
  qbTeam: string;
  rb: string;
  rbTeam: string;
  flex: string;
  flexTeam: string;
  flexPos: "WR" | "TE";
}>): WeekResults {
  const qbMap = new Map<string, PlayerSelection>();
  const rbMap = new Map<string, PlayerSelection>();
  const flexMap = new Map<string, PlayerSelection>();

  rawPicks.forEach(pick => {
    // Process QB
    if (!qbMap.has(pick.qb)) {
      qbMap.set(pick.qb, {
        name: pick.qb,
        team: pick.qbTeam,
        position: "QB",
        selectedBy: [pick.user],
        points: null,
        stats: {},
      });
    } else {
      qbMap.get(pick.qb)!.selectedBy.push(pick.user);
    }

    // Process RB
    if (!rbMap.has(pick.rb)) {
      rbMap.set(pick.rb, {
        name: pick.rb,
        team: pick.rbTeam,
        position: "RB",
        selectedBy: [pick.user],
        points: null,
        stats: {},
      });
    } else {
      rbMap.get(pick.rb)!.selectedBy.push(pick.user);
    }

    // Process Flex (WR/TE)
    if (!flexMap.has(pick.flex)) {
      flexMap.set(pick.flex, {
        name: pick.flex,
        team: pick.flexTeam,
        position: pick.flexPos,
        selectedBy: [pick.user],
        points: null,
        stats: {},
      });
    } else {
      flexMap.get(pick.flex)!.selectedBy.push(pick.user);
    }
  });

  return {
    qbs: Array.from(qbMap.values()),
    rbs: Array.from(rbMap.values()),
    flex: Array.from(flexMap.values()),
  };
}

export const playoffResultsByWeek = {
  week1: transformWeekPicks(rawWeek1),
  week2: transformWeekPicks(rawWeek2),
  week3: transformWeekPicks(rawWeek3),
  week4: transformWeekPicks(rawWeek4),
};

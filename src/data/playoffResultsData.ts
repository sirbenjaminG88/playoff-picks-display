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
  { user: "Jeremy", qb: "Patrick Mahomes", qbTeam: "KC", rb: "Austin Ekeler", rbTeam: "LAC", flex: "A.J. Brown", flexTeam: "PHI", flexPos: "WR" as const },
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

const week1Data = transformWeekPicks(rawWeek1);
const week2Data = transformWeekPicks(rawWeek2);
const week3Data = transformWeekPicks(rawWeek3);
const week4Data = transformWeekPicks(rawWeek4);

// Add Week 1 QB real stats
const joshAllen = week1Data.qbs.find(qb => qb.name === "Josh Allen");
if (joshAllen) {
  joshAllen.stats = {
    passYards: 272,
    passTDs: 2,
    rushYards: 46,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 1,
  };
}

const lamarJackson = week1Data.qbs.find(qb => qb.name === "Lamar Jackson");
if (lamarJackson) {
  lamarJackson.stats = {
    passYards: 175,
    passTDs: 2,
    rushYards: 81,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const bakerMayfield = week1Data.qbs.find(qb => qb.name === "Baker Mayfield");
if (bakerMayfield) {
  bakerMayfield.stats = {
    passYards: 185,
    passTDs: 2,
    rushYards: 23,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 1,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

// Add Week 1 RB real stats
const saquonBarkley = week1Data.rbs.find(rb => rb.name === "Saquon Barkley");
if (saquonBarkley) {
  saquonBarkley.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 123,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const kyrenWilliams = week1Data.rbs.find(rb => rb.name === "Kyren Williams");
if (kyrenWilliams) {
  kyrenWilliams.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 92,
    recYards: 0,
    rushTDs: 1,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

// Add Week 1 Flex real stats
const justinJefferson = week1Data.flex.find(wr => wr.name === "Justin Jefferson");
if (justinJefferson) {
  justinJefferson.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 58,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const pukaNacua = week1Data.flex.find(wr => wr.name === "Puka Nacua");
if (pukaNacua) {
  pukaNacua.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 51,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

// Add Week 2 QB real stats
const lamarJacksonW2 = week2Data.qbs.find(qb => qb.name === "Lamar Jackson");
if (lamarJacksonW2) {
  lamarJacksonW2.stats = {
    passYards: 254,
    passTDs: 2,
    rushYards: 39,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 2,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const joshAllenW2 = week2Data.qbs.find(qb => qb.name === "Josh Allen");
if (joshAllenW2) {
  joshAllenW2.stats = {
    passYards: 127,
    passTDs: 0,
    rushYards: 20,
    recYards: 0,
    rushTDs: 2,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

// Add Week 2 RB real stats
const derrickHenry = week2Data.rbs.find(rb => rb.name === "Derrick Henry");
if (derrickHenry) {
  derrickHenry.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 84,
    recYards: 0,
    rushTDs: 1,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const jahmyrGibbs = week2Data.rbs.find(rb => rb.name === "Jahmyr Gibbs");
if (jahmyrGibbs) {
  jahmyrGibbs.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 175,
    recYards: 0,
    rushTDs: 2,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

// Add Week 2 Flex real stats
const amonRaStBrown = week2Data.flex.find(wr => wr.name === "Amon-Ra St. Brown");
if (amonRaStBrown) {
  amonRaStBrown.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 137,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const pukaNacuaW2 = week2Data.flex.find(wr => wr.name === "Puka Nacua");
if (pukaNacuaW2) {
  pukaNacuaW2.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 97,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const nicoCollins = week2Data.flex.find(wr => wr.name === "Nico Collins");
if (nicoCollins) {
  nicoCollins.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 81,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

// Add Week 3 QB real stats
const patrickMahomes = week3Data.qbs.find(qb => qb.name === "Patrick Mahomes");
if (patrickMahomes) {
  patrickMahomes.stats = {
    passYards: 245,
    passTDs: 1,
    rushYards: 43,
    recYards: 0,
    rushTDs: 2,
    recTDs: 0,
    interceptions: 1,
    fumblesLost: 0,
    twoPtConversions: 1,
  };
}

// Add Week 3 RB real stats
const saquonBarkleyW3 = week3Data.rbs.find(rb => rb.name === "Saquon Barkley");
if (saquonBarkleyW3) {
  saquonBarkleyW3.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 122,
    recYards: 0,
    rushTDs: 3,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const brianRobinson = week3Data.rbs.find(rb => rb.name === "Brian Robinson Jr.");
if (brianRobinson) {
  brianRobinson.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 36,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const austinEkeler = week3Data.rbs.find(rb => rb.name === "Austin Ekeler");
if (austinEkeler) {
  austinEkeler.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 32,
    recYards: 0,
    rushTDs: 0,
    recTDs: 0,
    interceptions: 0,
    fumblesLost: 1,
    twoPtConversions: 0,
  };
}

// Add Week 3 Flex real stats
const terryMcLaurin = week3Data.flex.find(wr => wr.name === "Terry McLaurin");
if (terryMcLaurin) {
  terryMcLaurin.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 51,
    rushTDs: 0,
    recTDs: 1,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

const ajBrown = week3Data.flex.find(wr => wr.name === "A.J. Brown");
if (ajBrown) {
  ajBrown.stats = {
    passYards: 0,
    passTDs: 0,
    rushYards: 0,
    recYards: 96,
    rushTDs: 0,
    recTDs: 1,
    interceptions: 0,
    fumblesLost: 0,
    twoPtConversions: 0,
  };
}

export const playoffResultsByWeek = {
  week1: week1Data,
  week2: week2Data,
  week3: week3Data,
  week4: week4Data,
};

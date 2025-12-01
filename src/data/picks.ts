export interface PlayerPick {
  name: string;
  team: string;
  position: "QB" | "RB" | "WR" | "TE";
  selectedBy: string[];
  photoUrl?: string;
  points?: number | null;
}

export interface WeekData {
  week: number;
  players: PlayerPick[];
}

// Raw picks data structured for display
const rawPicks = {
  week1: [
    { user: "Jasper", qb: "Josh Allen", rb: "Saquon Barkley", wr: "Justin Jefferson" },
    { user: "Jeremy", qb: "Lamar Jackson", rb: "Saquon Barkley", wr: "Justin Jefferson" },
    { user: "Eric", qb: "Lamar Jackson", rb: "Saquon Barkley", wr: "Puka Nacua" },
    { user: "Ben", qb: "Baker Mayfield", rb: "Kyren Williams", wr: "Justin Jefferson" },
  ],
  week2: [
    { user: "Jasper", qb: "Lamar Jackson", rb: "Derrick Henry", wr: "Amon-Ra St. Brown" },
    { user: "Jeremy", qb: "Josh Allen", rb: "Jahmyr Gibbs", wr: "Puka Nacua" },
    { user: "Eric", qb: "Josh Allen", rb: "Jahmyr Gibbs", wr: "Amon-Ra St. Brown" },
    { user: "Ben", qb: "Josh Allen", rb: "Derrick Henry", wr: "Nico Collins" },
  ],
  week3: [
    { user: "Jasper", qb: "Patrick Mahomes", rb: "Brian Robinson Jr.", wr: "Terry McLaurin" },
    { user: "Jeremy", qb: "Patrick Mahomes", rb: "Austin Ekeler", wr: "Travis Kelce" },
    { user: "Eric", qb: "Patrick Mahomes", rb: "Brian Robinson Jr.", wr: "A.J. Brown" },
    { user: "Ben", qb: "Patrick Mahomes", rb: "Saquon Barkley", wr: "Terry McLaurin" },
  ],
  week4: [
    { user: "Jasper", qb: "Jalen Hurts", rb: "Isiah Pacheco", wr: "Xavier Worthy" },
    { user: "Jeremy", qb: "Jalen Hurts", rb: "Kareem Hunt", wr: "Xavier Worthy" },
    { user: "Eric", qb: "Jalen Hurts", rb: "Kareem Hunt", wr: "Xavier Worthy" },
    { user: "Ben", qb: "Jalen Hurts", rb: "Kareem Hunt", wr: "A.J. Brown" },
  ],
};

// Player team mappings (2024-2025 season)
const playerTeams: Record<string, string> = {
  "Josh Allen": "BUF",
  "Lamar Jackson": "BAL",
  "Baker Mayfield": "TB",
  "Patrick Mahomes": "KC",
  "Jalen Hurts": "PHI",
  "Saquon Barkley": "PHI",
  "Kyren Williams": "LAR",
  "Derrick Henry": "BAL",
  "Jahmyr Gibbs": "DET",
  "Brian Robinson Jr.": "WAS",
  "Austin Ekeler": "WAS",
  "Isiah Pacheco": "KC",
  "Kareem Hunt": "KC",
  "Justin Jefferson": "MIN",
  "Puka Nacua": "LAR",
  "Amon-Ra St. Brown": "DET",
  "Nico Collins": "HOU",
  "Terry McLaurin": "WAS",
  "Travis Kelce": "KC",
  "A.J. Brown": "PHI",
  "Xavier Worthy": "KC",
};

// Transform raw picks into structured player data
function transformWeekPicks(weekPicks: typeof rawPicks.week1): PlayerPick[] {
  const playerMap = new Map<string, PlayerPick>();

  weekPicks.forEach(pick => {
    // Process QB
    if (!playerMap.has(pick.qb)) {
      playerMap.set(pick.qb, {
        name: pick.qb,
        team: playerTeams[pick.qb] || "N/A",
        position: "QB",
        selectedBy: [pick.user],
      });
    } else {
      playerMap.get(pick.qb)!.selectedBy.push(pick.user);
    }

    // Process RB
    if (!playerMap.has(pick.rb)) {
      playerMap.set(pick.rb, {
        name: pick.rb,
        team: playerTeams[pick.rb] || "N/A",
        position: "RB",
        selectedBy: [pick.user],
      });
    } else {
      playerMap.get(pick.rb)!.selectedBy.push(pick.user);
    }

    // Process WR/TE
    const isTE = pick.wr === "Travis Kelce";
    if (!playerMap.has(pick.wr)) {
      playerMap.set(pick.wr, {
        name: pick.wr,
        team: playerTeams[pick.wr] || "N/A",
        position: isTE ? "TE" : "WR",
        selectedBy: [pick.user],
      });
    } else {
      playerMap.get(pick.wr)!.selectedBy.push(pick.user);
    }
  });

  return Array.from(playerMap.values());
}

export const weeksData: WeekData[] = [
  { week: 1, players: transformWeekPicks(rawPicks.week1) },
  { week: 2, players: transformWeekPicks(rawPicks.week2) },
  { week: 3, players: transformWeekPicks(rawPicks.week3) },
  { week: 4, players: transformWeekPicks(rawPicks.week4) },
];

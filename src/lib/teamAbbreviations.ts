// DraftKings team abbreviation to full team name mapping
export const DK_TEAM_ABBREV_TO_NAME: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAC: "Jacksonville Jaguars",
  JAX: "Jacksonville Jaguars", // Alternative abbreviation
  KC: "Kansas City Chiefs",
  LA: "Los Angeles Rams",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
  WSH: "Washington Commanders", // Alternative abbreviation
};

// Normalize player name for fuzzy matching
export function normalizePlayerName(name: string): string {
  return name
    .replace(/\s+(Jr\.?|Sr\.?|III|IV|II|V)$/i, "") // Remove suffixes
    .replace(/[.']/g, "") // Remove periods and apostrophes
    .trim()
    .toLowerCase();
}

// Get team name from DK abbreviation
export function getTeamNameFromAbbrev(abbrev: string): string | null {
  return DK_TEAM_ABBREV_TO_NAME[abbrev.toUpperCase()] || null;
}

// Parse DraftKings CSV row
export interface DKSalaryRow {
  position: string;
  name: string;
  dkId: string;
  salary: number;
  teamAbbrev: string;
  avgPoints: number;
}

export function parseDKCSV(csvContent: string): DKSalaryRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines
    .map((line) => {
      // Handle CSV with potential commas in fields
      const parts = line.split(",");
      if (parts.length < 8) return null;

      const salary = parseInt(parts[5], 10);
      if (isNaN(salary)) return null;

      return {
        position: parts[0].trim(),
        name: parts[2].trim(), // Column 2 is the clean name
        dkId: parts[3].trim(),
        salary,
        teamAbbrev: parts[7].trim(),
        avgPoints: parseFloat(parts[8]) || 0,
      };
    })
    .filter((row): row is DKSalaryRow => row !== null);
}

// Week labels for display
export const PLAYOFF_WEEK_LABELS: Record<number, string> = {
  1: "Wild Card",
  2: "Divisional",
  3: "Conference",
  4: "Super Bowl",
};

// Maps week numbers to their playoff round display labels
export const WEEK_LABELS: Record<number, string> = {
  1: "Wild Card",
  2: "Divisional Round",
  3: "Conference Championships",
  4: "Super Bowl",
};

// Short labels for tab display
export const WEEK_SHORT_LABELS: Record<number, string> = {
  1: "Wild Card",
  2: "Divisional",
  3: "Championships",
  4: "Super Bowl",
};

// ESPN-style abbreviated labels for tabs
export const WEEK_TAB_LABELS: Record<number, { abbrev: string; dates: string }> = {
  1: { abbrev: "WC", dates: "JAN 11–13" },
  2: { abbrev: "DIV RD", dates: "JAN 18–19" },
  3: { abbrev: "CONF CHAMP", dates: "JAN 26" },
  4: { abbrev: "SUPER BOWL", dates: "FEB 9" },
};

export const getWeekLabel = (weekNumber: number): string => {
  return WEEK_LABELS[weekNumber] || `Week ${weekNumber}`;
};

export const getWeekShortLabel = (weekNumber: number): string => {
  return WEEK_SHORT_LABELS[weekNumber] || `Week ${weekNumber}`;
};

export const getWeekTabLabel = (weekNumber: number): { abbrev: string; dates: string } => {
  return WEEK_TAB_LABELS[weekNumber] || { abbrev: `WK ${weekNumber}`, dates: "" };
};

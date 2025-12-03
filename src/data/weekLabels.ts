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

export const getWeekLabel = (weekNumber: number): string => {
  return WEEK_LABELS[weekNumber] || `Week ${weekNumber}`;
};

export const getWeekShortLabel = (weekNumber: number): string => {
  return WEEK_SHORT_LABELS[weekNumber] || `Week ${weekNumber}`;
};

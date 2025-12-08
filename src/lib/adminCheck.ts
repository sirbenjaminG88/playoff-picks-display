// Season configuration types and options
export type SeasonOption = "2025-playoffs" | "2025-regular";

export interface SeasonConfig {
  value: SeasonOption;
  label: string;
  season: number;
  seasonType: "playoffs" | "regular";
}

export const SEASON_OPTIONS: SeasonConfig[] = [
  { value: "2025-regular", label: "Regular Season", season: 2025, seasonType: "regular" },
  { value: "2025-playoffs", label: "Playoffs", season: 2025, seasonType: "playoffs" },
];

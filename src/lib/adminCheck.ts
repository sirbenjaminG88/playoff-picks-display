// Season configuration types and options
export type SeasonOption = "2024-playoffs" | "2025-regular";

export interface SeasonConfig {
  value: SeasonOption;
  label: string;
  season: number;
  seasonType: "playoffs" | "regular";
}

export const SEASON_OPTIONS: SeasonConfig[] = [
  { value: "2024-playoffs", label: "2024 Playoffs", season: 2024, seasonType: "playoffs" },
  { value: "2025-regular", label: "2025 Regular Season", season: 2025, seasonType: "regular" },
];

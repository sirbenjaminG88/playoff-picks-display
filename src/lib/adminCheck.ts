// Admin email for accessing beta features
const ADMIN_EMAIL = "benjaminmgold@gmail.com";

export function isAdminUser(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

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

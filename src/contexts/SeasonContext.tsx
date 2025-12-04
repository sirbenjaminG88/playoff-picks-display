import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

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

interface SeasonContextType {
  selectedSeason: SeasonOption;
  setSelectedSeason: (season: SeasonOption) => void;
  seasonConfig: SeasonConfig;
  canSelectSeason: boolean; // true only for admins
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  
  // Non-admins are always forced to 2025-regular
  const defaultSeason: SeasonOption = "2025-regular";
  const [selectedSeason, setSelectedSeasonInternal] = useState<SeasonOption>(defaultSeason);

  // When admin status changes, reset to default for non-admins
  useEffect(() => {
    if (!isAdmin) {
      setSelectedSeasonInternal("2025-regular");
    }
  }, [isAdmin]);

  const setSelectedSeason = (season: SeasonOption) => {
    // Only admins can change the season
    if (isAdmin) {
      setSelectedSeasonInternal(season);
    }
  };

  const seasonConfig = SEASON_OPTIONS.find(o => o.value === selectedSeason) || SEASON_OPTIONS[1];

  return (
    <SeasonContext.Provider value={{ 
      selectedSeason, 
      setSelectedSeason, 
      seasonConfig,
      canSelectSeason: isAdmin 
    }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error("useSeason must be used within a SeasonProvider");
  }
  return context;
}

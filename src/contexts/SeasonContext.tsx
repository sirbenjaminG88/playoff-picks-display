import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useLeague } from "./LeagueContext";

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
  canSelectSeason: boolean; // true only for commissioners
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const { currentLeague, isCommissioner } = useLeague();
  
  // Determine default season based on current league
  const getDefaultSeason = (): SeasonOption => {
    if (currentLeague) {
      if (currentLeague.season === 2025 && currentLeague.season_type === "REG") {
        return "2025-regular";
      }
      if (currentLeague.season === 2024) {
        return "2024-playoffs";
      }
    }
    // Default to 2025 regular season for beta
    return "2025-regular";
  };

  const [selectedSeason, setSelectedSeasonInternal] = useState<SeasonOption>(getDefaultSeason());

  // Update season when league changes
  useEffect(() => {
    if (currentLeague) {
      const defaultSeason = getDefaultSeason();
      // Only auto-update if user is not a commissioner (commissioners can toggle)
      if (!isCommissioner && !isAdmin) {
        setSelectedSeasonInternal(defaultSeason);
      }
    }
  }, [currentLeague, isCommissioner, isAdmin]);

  // Commissioners and admins can toggle seasons
  const canToggle = isCommissioner || isAdmin;

  const setSelectedSeason = (season: SeasonOption) => {
    if (canToggle) {
      setSelectedSeasonInternal(season);
    }
  };

  const seasonConfig = SEASON_OPTIONS.find(o => o.value === selectedSeason) || SEASON_OPTIONS[1];

  return (
    <SeasonContext.Provider value={{ 
      selectedSeason, 
      setSelectedSeason, 
      seasonConfig,
      canSelectSeason: canToggle 
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

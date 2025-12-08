import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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

interface SeasonContextType {
  selectedSeason: SeasonOption;
  setSelectedSeason: (season: SeasonOption) => void;
  seasonConfig: SeasonConfig;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  // Default to playoffs (the main product)
  const [selectedSeason, setSelectedSeason] = useState<SeasonOption>("2025-playoffs");

  const seasonConfig = SEASON_OPTIONS.find(o => o.value === selectedSeason) || SEASON_OPTIONS[1];

  return (
    <SeasonContext.Provider value={{ 
      selectedSeason, 
      setSelectedSeason, 
      seasonConfig,
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

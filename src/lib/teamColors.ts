// Soft pastel versions of each team's primary colors
export const teamColorMap: Record<string, { bg: string; text: string }> = {
  // AFC East
  BUF: { bg: "#D4E1FF", text: "#10245A" },
  MIA: { bg: "#D4F0F0", text: "#0A3A3A" },
  NE: { bg: "#D4E1FF", text: "#0E1F47" },
  NYJ: { bg: "#D9E8D4", text: "#0F3F0F" },
  
  // AFC North
  BAL: { bg: "#E6D9F7", text: "#2B1056" },
  CIN: { bg: "#FFE8D1", text: "#4A2707" },
  CLE: { bg: "#FFE4D1", text: "#4A2207" },
  PIT: { bg: "#FFF5D1", text: "#4A4207" },
  
  // AFC South
  HOU: { bg: "#E6D9EF", text: "#2E1748" },
  IND: { bg: "#D4E1FF", text: "#10245A" },
  JAX: { bg: "#D4E8E8", text: "#0A2F2F" },
  TEN: { bg: "#D4E1F0", text: "#0A2F4A" },
  
  // AFC West
  DEN: { bg: "#FFE4D1", text: "#4A2A07" },
  KC: { bg: "#F9D2D2", text: "#7A1A1A" },
  LV: { bg: "#E0E0E0", text: "#1A1A1A" },
  LAC: { bg: "#FFF5D1", text: "#0E3F6E" },
  
  // NFC East
  DAL: { bg: "#D7E4FF", text: "#0E1F47" },
  NYG: { bg: "#D4E1FF", text: "#0E1F47" },
  PHI: { bg: "#D6EFD8", text: "#0F3F20" },
  WAS: { bg: "#F7D9D9", text: "#5A1414" },
  
  // NFC North
  CHI: { bg: "#FFE4D1", text: "#0E1F47" },
  DET: { bg: "#D4ECF7", text: "#0C2D40" },
  GB: { bg: "#E4F2D5", text: "#18330A" },
  MIN: { bg: "#E2D9FA", text: "#26155A" },
  
  // NFC South
  ATL: { bg: "#F4D9D9", text: "#5A1010" },
  CAR: { bg: "#D4E8F0", text: "#0A2F40" },
  NO: { bg: "#FFF5D1", text: "#3A3A07" },
  TB: { bg: "#F4DADA", text: "#651818" },
  
  // NFC West
  ARI: { bg: "#F9D9D9", text: "#6A1010" },
  LA: { bg: "#FFF3D1", text: "#4A3509" },   // LA Rams
  LAR: { bg: "#FFF3D1", text: "#4A3509" },  // LA Rams alternate
  SF: { bg: "#F7E7D4", text: "#4A2A07" },
  SEA: { bg: "#D4E8D4", text: "#0A2F0A" },

  // Safe fallback
  DEFAULT: { bg: "#EEE", text: "#333" },
};

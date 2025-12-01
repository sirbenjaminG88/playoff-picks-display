import { Position } from "@/domain/types";

export interface AvailablePlayer {
  id: string;
  name: string;
  team: string;
  position: Position; // "QB" | "RB" | "WR" | "TE"
}

// For now we can hard-code a small sample list per week.
// Later this will be populated from the external NFL API.
export type AvailablePlayersByWeek = Record<number, AvailablePlayer[]>;

export const availablePlayersByWeek: AvailablePlayersByWeek = {
  1: [
    // QBs
    { id: "jalen-hurts-phi", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "jordan-love-gb", name: "Jordan Love", team: "GB", position: "QB" },
    { id: "josh-allen-buf", name: "Josh Allen", team: "BUF", position: "QB" },
    { id: "jared-goff-det", name: "Jared Goff", team: "DET", position: "QB" },
    
    // RBs
    { id: "saquon-barkley-phi", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "jahmyr-gibbs-det", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "josh-jacobs-gb", name: "Josh Jacobs", team: "GB", position: "RB" },
    { id: "james-cook-buf", name: "James Cook", team: "BUF", position: "RB" },
    
    // WRs/TEs
    { id: "amon-ra-st-brown-det", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "aj-brown-phi", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "devonta-smith-phi", name: "DeVonta Smith", team: "PHI", position: "WR" },
    { id: "khalil-shakir-buf", name: "Khalil Shakir", team: "BUF", position: "WR" },
    { id: "jayden-reed-gb", name: "Jayden Reed", team: "GB", position: "WR" },
    { id: "sam-laporta-det", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "dallas-goedert-phi", name: "Dallas Goedert", team: "PHI", position: "TE" },
    { id: "dalton-kincaid-buf", name: "Dalton Kincaid", team: "BUF", position: "TE" },
  ],
  2: [
    // QBs
    { id: "jalen-hurts-phi-w2", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "jared-goff-det-w2", name: "Jared Goff", team: "DET", position: "QB" },
    { id: "jayden-daniels-was-w2", name: "Jayden Daniels", team: "WAS", position: "QB" },
    { id: "baker-mayfield-tb-w2", name: "Baker Mayfield", team: "TB", position: "QB" },
    
    // RBs
    { id: "saquon-barkley-phi-w2", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "jahmyr-gibbs-det-w2", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "bucky-irving-tb-w2", name: "Bucky Irving", team: "TB", position: "RB" },
    { id: "brian-robinson-was-w2", name: "Brian Robinson Jr.", team: "WAS", position: "RB" },
    
    // WRs/TEs
    { id: "amon-ra-st-brown-det-w2", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "aj-brown-phi-w2", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "terry-mclaurin-was-w2", name: "Terry McLaurin", team: "WAS", position: "WR" },
    { id: "mike-evans-tb-w2", name: "Mike Evans", team: "TB", position: "WR" },
    { id: "sam-laporta-det-w2", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "dallas-goedert-phi-w2", name: "Dallas Goedert", team: "PHI", position: "TE" },
    { id: "cade-otton-tb-w2", name: "Cade Otton", team: "TB", position: "TE" },
  ],
  3: [
    // QBs
    { id: "jalen-hurts-phi-w3", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "jared-goff-det-w3", name: "Jared Goff", team: "DET", position: "QB" },
    { id: "patrick-mahomes-kc-w3", name: "Patrick Mahomes", team: "KC", position: "QB" },
    { id: "lamar-jackson-bal-w3", name: "Lamar Jackson", team: "BAL", position: "QB" },
    
    // RBs
    { id: "saquon-barkley-phi-w3", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "jahmyr-gibbs-det-w3", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "derrick-henry-bal-w3", name: "Derrick Henry", team: "BAL", position: "RB" },
    { id: "isiah-pacheco-kc-w3", name: "Isiah Pacheco", team: "KC", position: "RB" },
    
    // WRs/TEs
    { id: "amon-ra-st-brown-det-w3", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "aj-brown-phi-w3", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "xavier-worthy-kc-w3", name: "Xavier Worthy", team: "KC", position: "WR" },
    { id: "zay-flowers-bal-w3", name: "Zay Flowers", team: "BAL", position: "WR" },
    { id: "travis-kelce-kc-w3", name: "Travis Kelce", team: "KC", position: "TE" },
    { id: "sam-laporta-det-w3", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "dallas-goedert-phi-w3", name: "Dallas Goedert", team: "PHI", position: "TE" },
  ],
  4: [
    // QBs
    { id: "jalen-hurts-phi-w4", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "patrick-mahomes-kc-w4", name: "Patrick Mahomes", team: "KC", position: "QB" },
    
    // RBs
    { id: "isiah-pacheco-kc-w4", name: "Isiah Pacheco", team: "KC", position: "RB" },
    { id: "kareem-hunt-kc-w4", name: "Kareem Hunt", team: "KC", position: "RB" },
    
    // WRs/TEs
    { id: "xavier-worthy-kc-w4", name: "Xavier Worthy", team: "KC", position: "WR" },
    { id: "aj-brown-phi-w4", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "devonta-smith-phi-w4", name: "DeVonta Smith", team: "PHI", position: "WR" },
    { id: "travis-kelce-kc-w4", name: "Travis Kelce", team: "KC", position: "TE" },
    { id: "dallas-goedert-phi-w4", name: "Dallas Goedert", team: "PHI", position: "TE" },
  ],
};

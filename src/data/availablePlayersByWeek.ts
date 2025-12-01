import { Position } from "@/domain/types";

export interface AvailablePlayer {
  id: string;
  name: string;
  team: string;
  position: Position; // "QB" | "RB" | "WR" | "TE"
  photoUrl?: string;
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
    { id: "lamar-jackson-bal", name: "Lamar Jackson", team: "BAL", position: "QB" },
    { id: "patrick-mahomes-kc", name: "Patrick Mahomes", team: "KC", position: "QB" },
    { id: "brock-purdy-sf", name: "Brock Purdy", team: "SF", position: "QB" },
    { id: "tua-tagovailoa-mia", name: "Tua Tagovailoa", team: "MIA", position: "QB" },
    { id: "cj-stroud-hou", name: "C.J. Stroud", team: "HOU", position: "QB" },
    { id: "dak-prescott-dal", name: "Dak Prescott", team: "DAL", position: "QB" },
    { id: "matthew-stafford-lar", name: "Matthew Stafford", team: "LAR", position: "QB" },
    { id: "baker-mayfield-tb", name: "Baker Mayfield", team: "TB", position: "QB" },
    
    // RBs
    { id: "saquon-barkley-phi", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "jahmyr-gibbs-det", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "josh-jacobs-gb", name: "Josh Jacobs", team: "GB", position: "RB" },
    { id: "james-cook-buf", name: "James Cook", team: "BUF", position: "RB" },
    { id: "derrick-henry-bal", name: "Derrick Henry", team: "BAL", position: "RB" },
    { id: "christian-mccaffrey-sf", name: "Christian McCaffrey", team: "SF", position: "RB" },
    { id: "bijan-robinson-atl", name: "Bijan Robinson", team: "ATL", position: "RB" },
    { id: "breece-hall-nyj", name: "Breece Hall", team: "NYJ", position: "RB" },
    { id: "david-montgomery-det", name: "David Montgomery", team: "DET", position: "RB" },
    { id: "aaron-jones-min", name: "Aaron Jones", team: "MIN", position: "RB" },
    { id: "kyren-williams-lar", name: "Kyren Williams", team: "LAR", position: "RB" },
    { id: "isiah-pacheco-kc", name: "Isiah Pacheco", team: "KC", position: "RB" },
    { id: "rachaad-white-tb", name: "Rachaad White", team: "TB", position: "RB" },
    { id: "kenneth-walker-sea", name: "Kenneth Walker III", team: "SEA", position: "RB" },
    
    // WRs
    { id: "amon-ra-st-brown-det", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "aj-brown-phi", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "devonta-smith-phi", name: "DeVonta Smith", team: "PHI", position: "WR" },
    { id: "khalil-shakir-buf", name: "Khalil Shakir", team: "BUF", position: "WR" },
    { id: "jayden-reed-gb", name: "Jayden Reed", team: "GB", position: "WR" },
    { id: "tyreek-hill-mia", name: "Tyreek Hill", team: "MIA", position: "WR" },
    { id: "ceedee-lamb-dal", name: "CeeDee Lamb", team: "DAL", position: "WR" },
    { id: "justin-jefferson-min", name: "Justin Jefferson", team: "MIN", position: "WR" },
    { id: "ja-marr-chase-cin", name: "Ja'Marr Chase", team: "CIN", position: "WR" },
    { id: "nico-collins-hou", name: "Nico Collins", team: "HOU", position: "WR" },
    { id: "puka-nacua-lar", name: "Puka Nacua", team: "LAR", position: "WR" },
    { id: "deebo-samuel-sf", name: "Deebo Samuel", team: "SF", position: "WR" },
    { id: "dk-metcalf-sea", name: "DK Metcalf", team: "SEA", position: "WR" },
    { id: "mike-evans-tb", name: "Mike Evans", team: "TB", position: "WR" },
    
    // TEs
    { id: "sam-laporta-det", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "dallas-goedert-phi", name: "Dallas Goedert", team: "PHI", position: "TE" },
    { id: "dalton-kincaid-buf", name: "Dalton Kincaid", team: "BUF", position: "TE" },
    { id: "travis-kelce-kc", name: "Travis Kelce", team: "KC", position: "TE" },
    { id: "george-kittle-sf", name: "George Kittle", team: "SF", position: "TE" },
    { id: "tj-hockenson-min", name: "T.J. Hockenson", team: "MIN", position: "TE" },
    { id: "mark-andrews-bal", name: "Mark Andrews", team: "BAL", position: "TE" },
    { id: "trey-mcbride-ari", name: "Trey McBride", team: "ARI", position: "TE" },
    { id: "evan-engram-jax", name: "Evan Engram", team: "JAX", position: "TE" },
    { id: "david-njoku-cle", name: "David Njoku", team: "CLE", position: "TE" },
  ],
  2: [
    // QBs
    { id: "jalen-hurts-phi-w2", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "jared-goff-det-w2", name: "Jared Goff", team: "DET", position: "QB" },
    { id: "jayden-daniels-was-w2", name: "Jayden Daniels", team: "WAS", position: "QB" },
    { id: "baker-mayfield-tb-w2", name: "Baker Mayfield", team: "TB", position: "QB" },
    { id: "josh-allen-buf-w2", name: "Josh Allen", team: "BUF", position: "QB" },
    { id: "patrick-mahomes-kc-w2", name: "Patrick Mahomes", team: "KC", position: "QB" },
    { id: "lamar-jackson-bal-w2", name: "Lamar Jackson", team: "BAL", position: "QB" },
    { id: "jordan-love-gb-w2", name: "Jordan Love", team: "GB", position: "QB" },
    { id: "brock-purdy-sf-w2", name: "Brock Purdy", team: "SF", position: "QB" },
    { id: "matthew-stafford-lar-w2", name: "Matthew Stafford", team: "LAR", position: "QB" },
    { id: "dak-prescott-dal-w2", name: "Dak Prescott", team: "DAL", position: "QB" },
    { id: "tua-tagovailoa-mia-w2", name: "Tua Tagovailoa", team: "MIA", position: "QB" },
    
    // RBs
    { id: "saquon-barkley-phi-w2", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "jahmyr-gibbs-det-w2", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "bucky-irving-tb-w2", name: "Bucky Irving", team: "TB", position: "RB" },
    { id: "brian-robinson-was-w2", name: "Brian Robinson Jr.", team: "WAS", position: "RB" },
    { id: "derrick-henry-bal-w2", name: "Derrick Henry", team: "BAL", position: "RB" },
    { id: "james-cook-buf-w2", name: "James Cook", team: "BUF", position: "RB" },
    { id: "josh-jacobs-gb-w2", name: "Josh Jacobs", team: "GB", position: "RB" },
    { id: "christian-mccaffrey-sf-w2", name: "Christian McCaffrey", team: "SF", position: "RB" },
    { id: "kyren-williams-lar-w2", name: "Kyren Williams", team: "LAR", position: "RB" },
    { id: "bijan-robinson-atl-w2", name: "Bijan Robinson", team: "ATL", position: "RB" },
    { id: "isiah-pacheco-kc-w2", name: "Isiah Pacheco", team: "KC", position: "RB" },
    { id: "breece-hall-nyj-w2", name: "Breece Hall", team: "NYJ", position: "RB" },
    { id: "kenneth-walker-sea-w2", name: "Kenneth Walker III", team: "SEA", position: "RB" },
    
    // WRs
    { id: "amon-ra-st-brown-det-w2", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "aj-brown-phi-w2", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "terry-mclaurin-was-w2", name: "Terry McLaurin", team: "WAS", position: "WR" },
    { id: "mike-evans-tb-w2", name: "Mike Evans", team: "TB", position: "WR" },
    { id: "devonta-smith-phi-w2", name: "DeVonta Smith", team: "PHI", position: "WR" },
    { id: "khalil-shakir-buf-w2", name: "Khalil Shakir", team: "BUF", position: "WR" },
    { id: "jayden-reed-gb-w2", name: "Jayden Reed", team: "GB", position: "WR" },
    { id: "tyreek-hill-mia-w2", name: "Tyreek Hill", team: "MIA", position: "WR" },
    { id: "ceedee-lamb-dal-w2", name: "CeeDee Lamb", team: "DAL", position: "WR" },
    { id: "justin-jefferson-min-w2", name: "Justin Jefferson", team: "MIN", position: "WR" },
    { id: "puka-nacua-lar-w2", name: "Puka Nacua", team: "LAR", position: "WR" },
    { id: "deebo-samuel-sf-w2", name: "Deebo Samuel", team: "SF", position: "WR" },
    { id: "dk-metcalf-sea-w2", name: "DK Metcalf", team: "SEA", position: "WR" },
    
    // TEs
    { id: "sam-laporta-det-w2", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "dallas-goedert-phi-w2", name: "Dallas Goedert", team: "PHI", position: "TE" },
    { id: "cade-otton-tb-w2", name: "Cade Otton", team: "TB", position: "TE" },
    { id: "travis-kelce-kc-w2", name: "Travis Kelce", team: "KC", position: "TE" },
    { id: "george-kittle-sf-w2", name: "George Kittle", team: "SF", position: "TE" },
    { id: "dalton-kincaid-buf-w2", name: "Dalton Kincaid", team: "BUF", position: "TE" },
    { id: "mark-andrews-bal-w2", name: "Mark Andrews", team: "BAL", position: "TE" },
    { id: "trey-mcbride-ari-w2", name: "Trey McBride", team: "ARI", position: "TE" },
    { id: "evan-engram-jax-w2", name: "Evan Engram", team: "JAX", position: "TE" },
  ],
  3: [
    // QBs
    { id: "jalen-hurts-phi-w3", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "jared-goff-det-w3", name: "Jared Goff", team: "DET", position: "QB" },
    { id: "patrick-mahomes-kc-w3", name: "Patrick Mahomes", team: "KC", position: "QB" },
    { id: "lamar-jackson-bal-w3", name: "Lamar Jackson", team: "BAL", position: "QB" },
    { id: "josh-allen-buf-w3", name: "Josh Allen", team: "BUF", position: "QB" },
    { id: "jordan-love-gb-w3", name: "Jordan Love", team: "GB", position: "QB" },
    { id: "brock-purdy-sf-w3", name: "Brock Purdy", team: "SF", position: "QB" },
    { id: "baker-mayfield-tb-w3", name: "Baker Mayfield", team: "TB", position: "QB" },
    { id: "matthew-stafford-lar-w3", name: "Matthew Stafford", team: "LAR", position: "QB" },
    { id: "jayden-daniels-was-w3", name: "Jayden Daniels", team: "WAS", position: "QB" },
    { id: "dak-prescott-dal-w3", name: "Dak Prescott", team: "DAL", position: "QB" },
    { id: "tua-tagovailoa-mia-w3", name: "Tua Tagovailoa", team: "MIA", position: "QB" },
    
    // RBs
    { id: "saquon-barkley-phi-w3", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "jahmyr-gibbs-det-w3", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "derrick-henry-bal-w3", name: "Derrick Henry", team: "BAL", position: "RB" },
    { id: "isiah-pacheco-kc-w3", name: "Isiah Pacheco", team: "KC", position: "RB" },
    { id: "james-cook-buf-w3", name: "James Cook", team: "BUF", position: "RB" },
    { id: "josh-jacobs-gb-w3", name: "Josh Jacobs", team: "GB", position: "RB" },
    { id: "christian-mccaffrey-sf-w3", name: "Christian McCaffrey", team: "SF", position: "RB" },
    { id: "kyren-williams-lar-w3", name: "Kyren Williams", team: "LAR", position: "RB" },
    { id: "bucky-irving-tb-w3", name: "Bucky Irving", team: "TB", position: "RB" },
    { id: "bijan-robinson-atl-w3", name: "Bijan Robinson", team: "ATL", position: "RB" },
    { id: "brian-robinson-was-w3", name: "Brian Robinson Jr.", team: "WAS", position: "RB" },
    { id: "breece-hall-nyj-w3", name: "Breece Hall", team: "NYJ", position: "RB" },
    { id: "kenneth-walker-sea-w3", name: "Kenneth Walker III", team: "SEA", position: "RB" },
    
    // WRs
    { id: "amon-ra-st-brown-det-w3", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "aj-brown-phi-w3", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "xavier-worthy-kc-w3", name: "Xavier Worthy", team: "KC", position: "WR" },
    { id: "zay-flowers-bal-w3", name: "Zay Flowers", team: "BAL", position: "WR" },
    { id: "devonta-smith-phi-w3", name: "DeVonta Smith", team: "PHI", position: "WR" },
    { id: "khalil-shakir-buf-w3", name: "Khalil Shakir", team: "BUF", position: "WR" },
    { id: "jayden-reed-gb-w3", name: "Jayden Reed", team: "GB", position: "WR" },
    { id: "tyreek-hill-mia-w3", name: "Tyreek Hill", team: "MIA", position: "WR" },
    { id: "ceedee-lamb-dal-w3", name: "CeeDee Lamb", team: "DAL", position: "WR" },
    { id: "justin-jefferson-min-w3", name: "Justin Jefferson", team: "MIN", position: "WR" },
    { id: "puka-nacua-lar-w3", name: "Puka Nacua", team: "LAR", position: "WR" },
    { id: "deebo-samuel-sf-w3", name: "Deebo Samuel", team: "SF", position: "WR" },
    { id: "dk-metcalf-sea-w3", name: "DK Metcalf", team: "SEA", position: "WR" },
    { id: "mike-evans-tb-w3", name: "Mike Evans", team: "TB", position: "WR" },
    
    // TEs
    { id: "travis-kelce-kc-w3", name: "Travis Kelce", team: "KC", position: "TE" },
    { id: "sam-laporta-det-w3", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "dallas-goedert-phi-w3", name: "Dallas Goedert", team: "PHI", position: "TE" },
    { id: "george-kittle-sf-w3", name: "George Kittle", team: "SF", position: "TE" },
    { id: "dalton-kincaid-buf-w3", name: "Dalton Kincaid", team: "BUF", position: "TE" },
    { id: "mark-andrews-bal-w3", name: "Mark Andrews", team: "BAL", position: "TE" },
    { id: "trey-mcbride-ari-w3", name: "Trey McBride", team: "ARI", position: "TE" },
    { id: "cade-otton-tb-w3", name: "Cade Otton", team: "TB", position: "TE" },
    { id: "evan-engram-jax-w3", name: "Evan Engram", team: "JAX", position: "TE" },
  ],
  4: [
    // QBs
    { id: "jalen-hurts-phi-w4", name: "Jalen Hurts", team: "PHI", position: "QB" },
    { id: "patrick-mahomes-kc-w4", name: "Patrick Mahomes", team: "KC", position: "QB" },
    { id: "lamar-jackson-bal-w4", name: "Lamar Jackson", team: "BAL", position: "QB" },
    { id: "josh-allen-buf-w4", name: "Josh Allen", team: "BUF", position: "QB" },
    { id: "jared-goff-det-w4", name: "Jared Goff", team: "DET", position: "QB" },
    { id: "jordan-love-gb-w4", name: "Jordan Love", team: "GB", position: "QB" },
    { id: "brock-purdy-sf-w4", name: "Brock Purdy", team: "SF", position: "QB" },
    { id: "baker-mayfield-tb-w4", name: "Baker Mayfield", team: "TB", position: "QB" },
    { id: "matthew-stafford-lar-w4", name: "Matthew Stafford", team: "LAR", position: "QB" },
    { id: "jayden-daniels-was-w4", name: "Jayden Daniels", team: "WAS", position: "QB" },
    { id: "dak-prescott-dal-w4", name: "Dak Prescott", team: "DAL", position: "QB" },
    { id: "tua-tagovailoa-mia-w4", name: "Tua Tagovailoa", team: "MIA", position: "QB" },
    
    // RBs
    { id: "isiah-pacheco-kc-w4", name: "Isiah Pacheco", team: "KC", position: "RB" },
    { id: "kareem-hunt-kc-w4", name: "Kareem Hunt", team: "KC", position: "RB" },
    { id: "saquon-barkley-phi-w4", name: "Saquon Barkley", team: "PHI", position: "RB" },
    { id: "derrick-henry-bal-w4", name: "Derrick Henry", team: "BAL", position: "RB" },
    { id: "james-cook-buf-w4", name: "James Cook", team: "BUF", position: "RB" },
    { id: "jahmyr-gibbs-det-w4", name: "Jahmyr Gibbs", team: "DET", position: "RB" },
    { id: "josh-jacobs-gb-w4", name: "Josh Jacobs", team: "GB", position: "RB" },
    { id: "christian-mccaffrey-sf-w4", name: "Christian McCaffrey", team: "SF", position: "RB" },
    { id: "kyren-williams-lar-w4", name: "Kyren Williams", team: "LAR", position: "RB" },
    { id: "bucky-irving-tb-w4", name: "Bucky Irving", team: "TB", position: "RB" },
    { id: "bijan-robinson-atl-w4", name: "Bijan Robinson", team: "ATL", position: "RB" },
    { id: "brian-robinson-was-w4", name: "Brian Robinson Jr.", team: "WAS", position: "RB" },
    { id: "breece-hall-nyj-w4", name: "Breece Hall", team: "NYJ", position: "RB" },
    
    // WRs
    { id: "xavier-worthy-kc-w4", name: "Xavier Worthy", team: "KC", position: "WR" },
    { id: "aj-brown-phi-w4", name: "A.J. Brown", team: "PHI", position: "WR" },
    { id: "devonta-smith-phi-w4", name: "DeVonta Smith", team: "PHI", position: "WR" },
    { id: "zay-flowers-bal-w4", name: "Zay Flowers", team: "BAL", position: "WR" },
    { id: "khalil-shakir-buf-w4", name: "Khalil Shakir", team: "BUF", position: "WR" },
    { id: "amon-ra-st-brown-det-w4", name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
    { id: "jayden-reed-gb-w4", name: "Jayden Reed", team: "GB", position: "WR" },
    { id: "tyreek-hill-mia-w4", name: "Tyreek Hill", team: "MIA", position: "WR" },
    { id: "ceedee-lamb-dal-w4", name: "CeeDee Lamb", team: "DAL", position: "WR" },
    { id: "justin-jefferson-min-w4", name: "Justin Jefferson", team: "MIN", position: "WR" },
    { id: "puka-nacua-lar-w4", name: "Puka Nacua", team: "LAR", position: "WR" },
    { id: "deebo-samuel-sf-w4", name: "Deebo Samuel", team: "SF", position: "WR" },
    { id: "mike-evans-tb-w4", name: "Mike Evans", team: "TB", position: "WR" },
    
    // TEs
    { id: "travis-kelce-kc-w4", name: "Travis Kelce", team: "KC", position: "TE" },
    { id: "dallas-goedert-phi-w4", name: "Dallas Goedert", team: "PHI", position: "TE" },
    { id: "mark-andrews-bal-w4", name: "Mark Andrews", team: "BAL", position: "TE" },
    { id: "dalton-kincaid-buf-w4", name: "Dalton Kincaid", team: "BUF", position: "TE" },
    { id: "sam-laporta-det-w4", name: "Sam LaPorta", team: "DET", position: "TE" },
    { id: "george-kittle-sf-w4", name: "George Kittle", team: "SF", position: "TE" },
    { id: "trey-mcbride-ari-w4", name: "Trey McBride", team: "ARI", position: "TE" },
    { id: "cade-otton-tb-w4", name: "Cade Otton", team: "TB", position: "TE" },
    { id: "evan-engram-jax-w4", name: "Evan Engram", team: "JAX", position: "TE" },
  ],
};

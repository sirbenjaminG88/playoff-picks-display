import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ESPN team IDs and their abbreviations (mapped to our DB team_abbr)
const ESPN_TEAMS: { id: number; espnAbbr: string; dbAbbr: string }[] = [
  { id: 1, espnAbbr: "ATL", dbAbbr: "ATL" },
  { id: 2, espnAbbr: "BUF", dbAbbr: "BUF" },
  { id: 3, espnAbbr: "CHI", dbAbbr: "CHI" },
  { id: 4, espnAbbr: "CIN", dbAbbr: "CIN" },
  { id: 5, espnAbbr: "CLE", dbAbbr: "CLE" },
  { id: 6, espnAbbr: "DAL", dbAbbr: "DAL" },
  { id: 7, espnAbbr: "DEN", dbAbbr: "DEN" },
  { id: 8, espnAbbr: "DET", dbAbbr: "DET" },
  { id: 9, espnAbbr: "GB", dbAbbr: "GB" },
  { id: 10, espnAbbr: "TEN", dbAbbr: "TEN" },
  { id: 11, espnAbbr: "IND", dbAbbr: "IND" },
  { id: 12, espnAbbr: "KC", dbAbbr: "KC" },
  { id: 13, espnAbbr: "LV", dbAbbr: "LV" },
  { id: 14, espnAbbr: "LAR", dbAbbr: "LA" },  // ESPN uses LAR, our DB uses LA
  { id: 15, espnAbbr: "MIA", dbAbbr: "MIA" },
  { id: 16, espnAbbr: "MIN", dbAbbr: "MIN" },
  { id: 17, espnAbbr: "NE", dbAbbr: "NE" },
  { id: 18, espnAbbr: "NO", dbAbbr: "NO" },
  { id: 19, espnAbbr: "NYG", dbAbbr: "NYG" },
  { id: 20, espnAbbr: "NYJ", dbAbbr: "NYJ" },
  { id: 21, espnAbbr: "PHI", dbAbbr: "PHI" },
  { id: 22, espnAbbr: "ARI", dbAbbr: "ARI" },
  { id: 23, espnAbbr: "PIT", dbAbbr: "PIT" },
  { id: 24, espnAbbr: "LAC", dbAbbr: "LAC" },
  { id: 25, espnAbbr: "SF", dbAbbr: "SF" },
  { id: 26, espnAbbr: "SEA", dbAbbr: "SEA" },
  { id: 27, espnAbbr: "TB", dbAbbr: "TB" },
  { id: 28, espnAbbr: "WSH", dbAbbr: "WAS" },  // ESPN uses WSH, our DB uses WAS
  { id: 29, espnAbbr: "CAR", dbAbbr: "CAR" },
  { id: 30, espnAbbr: "JAX", dbAbbr: "JAX" },
  { id: 33, espnAbbr: "BAL", dbAbbr: "BAL" },
  { id: 34, espnAbbr: "HOU", dbAbbr: "HOU" },
];

interface ESPNPlayer {
  id: string;
  fullName: string;
  position?: { abbreviation: string };
  headshot?: { href: string };
}

interface ESPNRosterResponse {
  athletes?: Array<{
    items?: ESPNPlayer[];
  }>;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.']/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s?(jr|sr|ii|iii|iv|v)$/i, "");
}

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) return false;

  const { data: hasAdminRole } = await supabaseAdmin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  return hasAdminRole === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting ESPN roster headshot sync...");

    const allEspnPlayers: { name: string; normalizedName: string; teamAbbr: string; headshotUrl: string }[] = [];
    const teamErrors: string[] = [];

    // Fetch all team rosters from ESPN
    for (const team of ESPN_TEAMS) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/roster`;
        console.log(`Fetching ${team.dbAbbr} roster...`);
        
        const response = await fetch(url);
        if (!response.ok) {
          teamErrors.push(`${team.dbAbbr}: HTTP ${response.status}`);
          continue;
        }

        const data: ESPNRosterResponse = await response.json();
        
        // ESPN roster response has athletes grouped by position category
        if (data.athletes) {
          for (const group of data.athletes) {
            if (group.items) {
              for (const player of group.items) {
                // Only include players with headshots
                if (player.headshot?.href && player.fullName) {
                  allEspnPlayers.push({
                    name: player.fullName,
                    normalizedName: normalizeName(player.fullName),
                    teamAbbr: team.dbAbbr,  // Use our DB abbreviation for matching
                    headshotUrl: player.headshot.href,
                  });
                }
              }
            }
          }
        }

        // Small delay to be nice to ESPN's API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        teamErrors.push(`${team.dbAbbr}: ${message}`);
      }
    }

    console.log(`Fetched ${allEspnPlayers.length} ESPN players with headshots`);

    // Get all our players for 2025 season
    const { data: ourPlayers, error: playersError } = await supabase
      .from("players")
      .select("id, full_name, team_abbr")
      .eq("season", 2025);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Matching against ${ourPlayers?.length || 0} players in database`);

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatched: string[] = [];

    // Match and update
    for (const espnPlayer of allEspnPlayers) {
      // Find matching player by normalized name AND team
      const match = ourPlayers?.find(p => 
        normalizeName(p.full_name) === espnPlayer.normalizedName &&
        p.team_abbr === espnPlayer.teamAbbr
      );

      if (match) {
        const { error: updateError } = await supabase
          .from("players")
          .update({ espn_headshot_url: espnPlayer.headshotUrl })
          .eq("id", match.id);

        if (!updateError) {
          matchedCount++;
        }
      } else {
        unmatchedCount++;
        if (unmatched.length < 20) {
          unmatched.push(`${espnPlayer.name} (${espnPlayer.teamAbbr})`);
        }
      }
    }

    console.log(`Sync complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        espnPlayersFound: allEspnPlayers.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        unmatchedSample: unmatched,
        teamErrors: teamErrors.length > 0 ? teamErrors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ESPN team IDs and their abbreviations
const ESPN_TEAMS: { id: number; abbr: string }[] = [
  { id: 1, abbr: "ATL" },
  { id: 2, abbr: "BUF" },
  { id: 3, abbr: "CHI" },
  { id: 4, abbr: "CIN" },
  { id: 5, abbr: "CLE" },
  { id: 6, abbr: "DAL" },
  { id: 7, abbr: "DEN" },
  { id: 8, abbr: "DET" },
  { id: 9, abbr: "GB" },
  { id: 10, abbr: "TEN" },
  { id: 11, abbr: "IND" },
  { id: 12, abbr: "KC" },
  { id: 13, abbr: "LV" },
  { id: 14, abbr: "LAR" },
  { id: 15, abbr: "MIA" },
  { id: 16, abbr: "MIN" },
  { id: 17, abbr: "NE" },
  { id: 18, abbr: "NO" },
  { id: 19, abbr: "NYG" },
  { id: 20, abbr: "NYJ" },
  { id: 21, abbr: "PHI" },
  { id: 22, abbr: "ARI" },
  { id: 23, abbr: "PIT" },
  { id: 24, abbr: "LAC" },
  { id: 25, abbr: "SF" },
  { id: 26, abbr: "SEA" },
  { id: 27, abbr: "TB" },
  { id: 28, abbr: "WSH" },
  { id: 29, abbr: "CAR" },
  { id: 30, abbr: "JAX" },
  { id: 33, abbr: "BAL" },
  { id: 34, abbr: "HOU" },
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
        console.log(`Fetching ${team.abbr} roster...`);
        
        const response = await fetch(url);
        if (!response.ok) {
          teamErrors.push(`${team.abbr}: HTTP ${response.status}`);
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
                    teamAbbr: team.abbr,
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
        teamErrors.push(`${team.abbr}: ${message}`);
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

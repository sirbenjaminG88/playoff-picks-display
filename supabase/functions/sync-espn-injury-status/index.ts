import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ESPN team ID mapping: API-Sports team_id → ESPN team_id
const espnTeamIds: Record<number, number> = {
  // AFC teams
  28: 7,   // Broncos
  20: 2,   // Bills
  3: 17,   // Patriots
  26: 34,  // Texans
  6: 33,   // Ravens
  22: 23,  // Steelers
  30: 24,  // Chargers
  2: 30,   // Jaguars
  
  // NFC teams
  23: 26,  // Seahawks
  14: 25,  // 49ers
  16: 3,   // Bears
  31: 14,  // Rams
  11: 8,   // Lions
  12: 21,  // Eagles
  9: 16,   // Vikings
  25: 28,  // Commanders
  15: 9,   // Packers
  19: 29,  // Panthers
};

interface EspnAthlete {
  id: string;
  displayName: string;
  fullName?: string;
  injuries?: Array<{
    type: { abbreviation: string; description: string };
    status: string;
  }>;
  status?: {
    type: { abbreviation: string };
  };
}

interface EspnRosterResponse {
  athletes?: Array<{
    items: EspnAthlete[];
    position?: string;
  }>;
}

// Map ESPN injury status to our status
function mapInjuryStatus(athlete: EspnAthlete): string {
  // Check for IR/PUP/NFI status first
  const statusAbbr = athlete.status?.type?.abbreviation?.toLowerCase();
  if (statusAbbr === 'ir' || statusAbbr === 'pup' || statusAbbr === 'nfi') {
    return 'ir';
  }
  
  // Check injuries array
  if (athlete.injuries && athlete.injuries.length > 0) {
    const injury = athlete.injuries[0];
    const injuryStatus = injury.status?.toLowerCase();
    const typeAbbr = injury.type?.abbreviation?.toLowerCase();
    
    if (typeAbbr === 'o' || injuryStatus?.includes('out')) return 'out';
    if (typeAbbr === 'd' || injuryStatus?.includes('doubtful')) return 'doubtful';
    if (typeAbbr === 'q' || injuryStatus?.includes('questionable')) return 'questionable';
    if (typeAbbr === 'p' || injuryStatus?.includes('probable')) return 'probable';
  }
  
  return 'active';
}

// Extract ESPN player ID from headshot URL
function extractEspnPlayerId(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/players\/full\/(\d+)/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const season = 2025;
    console.log(`Starting ESPN injury status sync for season ${season}...`);

    // Step 1: Fetch all playoff players for season 2025
    const { data: players, error: playersError } = await supabase
      .from("playoff_players")
      .select("id, player_id, name, position, team_id, team_name, image_url, espn_player_id, injury_status")
      .eq("season", season);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players?.length || 0} players in playoff_players`);

    // Step 2: Build ESPN ID → player mapping
    const espnIdToPlayer = new Map<string, typeof players[0]>();
    for (const player of players || []) {
      // Try espn_player_id first, then extract from image_url
      const espnId = player.espn_player_id || extractEspnPlayerId(player.image_url);
      if (espnId) {
        espnIdToPlayer.set(espnId, player);
      }
    }

    // Step 3: Get unique team IDs
    const teamIds = [...new Set((players || []).map(p => p.team_id))];
    console.log(`Processing ${teamIds.length} teams`);

    const results = {
      teamsProcessed: 0,
      playersUpdated: 0,
      injuriesFound: [] as { name: string; team: string; status: string; previous: string }[],
      errors: [] as string[],
    };

    // Step 4: For each team, fetch ESPN roster and update injury status
    for (const teamId of teamIds) {
      const espnTeamId = espnTeamIds[teamId];
      if (!espnTeamId) {
        console.log(`No ESPN team ID mapping for team ${teamId}`);
        results.errors.push(`No ESPN mapping for team_id ${teamId}`);
        continue;
      }

      const teamName = players?.find(p => p.team_id === teamId)?.team_name || `Team ${teamId}`;
      console.log(`Fetching roster for ${teamName} (ESPN ID: ${espnTeamId})...`);

      try {
        // Fetch roster with injury info
        const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeamId}/roster`;
        const response = await fetch(rosterUrl);
        
        if (!response.ok) {
          console.error(`ESPN API error for team ${espnTeamId}: ${response.status}`);
          results.errors.push(`ESPN API error for ${teamName}: ${response.status}`);
          continue;
        }

        const data: EspnRosterResponse = await response.json();
        results.teamsProcessed++;

        // Process all position groups
        const allAthletes: EspnAthlete[] = [];
        for (const group of data.athletes || []) {
          allAthletes.push(...(group.items || []));
        }

        console.log(`Found ${allAthletes.length} athletes on ${teamName} roster`);

        for (const athlete of allAthletes) {
          const matchedPlayer = espnIdToPlayer.get(athlete.id);
          
          if (matchedPlayer && matchedPlayer.team_id === teamId) {
            const newStatus = mapInjuryStatus(athlete);
            const previousStatus = matchedPlayer.injury_status || 'active';
            
            // Only update if status changed
            if (newStatus !== previousStatus) {
              const { error: updateError } = await supabase
                .from("playoff_players")
                .update({
                  injury_status: newStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", matchedPlayer.id);

              if (updateError) {
                console.error(`Failed to update ${matchedPlayer.name}: ${updateError.message}`);
                results.errors.push(`Update failed for ${matchedPlayer.name}`);
              } else {
                results.playersUpdated++;
                results.injuriesFound.push({
                  name: matchedPlayer.name,
                  team: teamName,
                  status: newStatus,
                  previous: previousStatus,
                });
                console.log(`Updated ${matchedPlayer.name}: ${previousStatus} → ${newStatus}`);
              }
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing team ${teamId}:`, err);
        results.errors.push(`Error for ${teamName}: ${errorMessage}`);
      }
    }

    console.log(`Sync complete: ${results.playersUpdated} players updated`);

    return new Response(
      JSON.stringify({
        success: true,
        season,
        teamsProcessed: results.teamsProcessed,
        playersUpdated: results.playersUpdated,
        injuryChanges: results.injuriesFound,
        errors: results.errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

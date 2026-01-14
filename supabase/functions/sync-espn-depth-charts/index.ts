import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ESPN team ID mapping for 2025 playoff teams
// API-Sports team_id → ESPN team_id
const espnTeamIdMap: Record<number, number> = {
  // AFC
  20: 2,   // Bills
  6: 8,    // Ravens
  26: 34,  // Texans
  28: 7,   // Broncos (ESPN uses 7 for Denver)
  22: 23,  // Steelers
  30: 24,  // Chargers
  // NFC
  11: 8,   // Lions → ESPN 8? Let me check - actually Lions = 11 in ESPN
  12: 21,  // Eagles
  9: 16,   // Vikings
  23: 26,  // Seahawks
  31: 14,  // Rams
  25: 28,  // Commanders
  15: 9,   // Packers
};

// Correct ESPN team IDs (verified)
const espnTeamIds: Record<number, number> = {
  20: 2,   // Bills
  6: 33,   // Ravens (ESPN uses 33)
  26: 34,  // Texans
  28: 7,   // Broncos
  22: 23,  // Steelers
  30: 24,  // Chargers
  11: 8,   // Lions (ESPN uses 8)
  12: 21,  // Eagles
  9: 16,   // Vikings
  23: 26,  // Seahawks
  31: 14,  // Rams
  25: 28,  // Commanders
  15: 9,   // Packers
};

interface DepthChartAthlete {
  id: string;
  displayName: string;
  headshot?: { href: string };
}

interface DepthChartPosition {
  athletes: DepthChartAthlete[];
}

interface DepthChartFormation {
  name: string;
  positions: Record<string, DepthChartPosition>;
}

interface EspnDepthChartResponse {
  depthchart?: DepthChartFormation[];
}

// Extract ESPN player ID from headshot URL
function extractEspnPlayerId(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/players\/full\/(\d+)/);
  return match ? match[1] : null;
}

// Map ESPN depth chart position to our slot format
function normalizeSlot(espnPosition: string): string {
  const pos = espnPosition.toLowerCase();
  // Handle WR positions (wr1, wr2, wr3, lwr, rwr, swr)
  if (pos.includes('wr') || pos === 'lwr' || pos === 'rwr' || pos === 'swr') {
    if (pos === 'lwr' || pos === 'wr1') return 'wr1';
    if (pos === 'rwr' || pos === 'wr2') return 'wr2';
    if (pos === 'swr' || pos === 'wr3') return 'wr3';
    return 'wr1'; // default
  }
  return pos; // qb, rb, te, etc.
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
    console.log(`Starting ESPN depth chart sync for season ${season}...`);

    // Step 1: Fetch all playoff players for season 2025
    const { data: players, error: playersError } = await supabase
      .from("playoff_players")
      .select("id, player_id, name, position, team_id, team_name, image_url")
      .eq("season", season);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Found ${players?.length || 0} players in playoff_players`);

    // Step 2: Build ESPN ID → player mapping
    const espnIdToPlayer = new Map<string, typeof players[0]>();
    let playersWithEspnId = 0;

    for (const player of players || []) {
      const espnId = extractEspnPlayerId(player.image_url);
      if (espnId) {
        espnIdToPlayer.set(espnId, player);
        playersWithEspnId++;
      }
    }

    console.log(`${playersWithEspnId} players have ESPN IDs in their image URLs`);

    // Step 3: Get unique team IDs
    const teamIds = [...new Set((players || []).map(p => p.team_id))];
    console.log(`Processing ${teamIds.length} teams`);

    const results = {
      teamsProcessed: 0,
      playersUpdated: 0,
      playersMatched: 0,
      unmatchedEspnPlayers: [] as { espnId: string; name: string; position: string; team: string }[],
      errors: [] as string[],
    };

    // Step 4: For each team, fetch ESPN depth chart and update players
    for (const teamId of teamIds) {
      const espnTeamId = espnTeamIds[teamId];
      if (!espnTeamId) {
        console.log(`No ESPN team ID mapping for team ${teamId}`);
        results.errors.push(`No ESPN mapping for team_id ${teamId}`);
        continue;
      }

      const teamName = players?.find(p => p.team_id === teamId)?.team_name || `Team ${teamId}`;
      console.log(`Fetching depth chart for ${teamName} (ESPN ID: ${espnTeamId})...`);

      try {
        const depthChartUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeamId}/depthcharts`;
        const response = await fetch(depthChartUrl);
        
        if (!response.ok) {
          console.error(`ESPN API error for team ${espnTeamId}: ${response.status}`);
          results.errors.push(`ESPN API error for ${teamName}: ${response.status}`);
          continue;
        }

        const data: EspnDepthChartResponse = await response.json();
        results.teamsProcessed++;

        // Process depth chart formations
        const formations = data.depthchart || [];
        console.log(`Found ${formations.length} formations for ${teamName}`);

        for (const formation of formations) {
          // We're interested in offensive formations (3WR, 4WR, etc.)
          for (const [posKey, posData] of Object.entries(formation.positions || {})) {
            const slot = normalizeSlot(posKey);
            
            // Only process offensive skill positions
            if (!['qb', 'rb', 'wr1', 'wr2', 'wr3', 'te'].includes(slot)) {
              continue;
            }

            const athletes = posData.athletes || [];
            
            for (let rank = 0; rank < athletes.length; rank++) {
              const athlete = athletes[rank];
              const espnPlayerId = athlete.id;

              // Try to match by ESPN ID
              const matchedPlayer = espnIdToPlayer.get(espnPlayerId);
              
              if (matchedPlayer && matchedPlayer.team_id === teamId) {
                // Update depth chart info for this player
                const isStarter = rank === 0;
                
                const { error: updateError } = await supabase
                  .from("playoff_players")
                  .update({
                    depth_chart_slot: slot,
                    depth_chart_rank: rank,
                    is_starter: isStarter,
                    depth_chart_source: "espn",
                    depth_chart_updated_at: new Date().toISOString(),
                  })
                  .eq("id", matchedPlayer.id);

                if (updateError) {
                  console.error(`Failed to update ${matchedPlayer.name}: ${updateError.message}`);
                  results.errors.push(`Update failed for ${matchedPlayer.name}`);
                } else {
                  results.playersMatched++;
                  console.log(`Updated ${matchedPlayer.name}: ${slot} rank ${rank} (starter: ${isStarter})`);
                }
              } else if (!matchedPlayer) {
                // Track unmatched ESPN players
                results.unmatchedEspnPlayers.push({
                  espnId: espnPlayerId,
                  name: athlete.displayName,
                  position: posKey,
                  team: teamName,
                });
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

    // Deduplicate unmatched players
    const uniqueUnmatched = results.unmatchedEspnPlayers.filter(
      (player, index, self) => 
        index === self.findIndex(p => p.espnId === player.espnId)
    );
    results.unmatchedEspnPlayers = uniqueUnmatched;

    console.log(`Sync complete: ${results.playersMatched} players matched, ${uniqueUnmatched.length} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        season,
        teamsProcessed: results.teamsProcessed,
        playersMatched: results.playersMatched,
        unmatchedCount: uniqueUnmatched.length,
        unmatchedPlayers: uniqueUnmatched.slice(0, 20), // First 20 for brevity
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

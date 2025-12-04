import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OFFENSIVE_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for season parameter
    let season = 2025;
    try {
      const body = await req.json();
      if (body.season) {
        season = parseInt(body.season);
      }
    } catch {
      // Default to 2025 if no body or invalid JSON
    }

    console.log(`Syncing players for season ${season}`);

    const apiSportsKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiSportsKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get all NFL teams for the season
    console.log('Fetching NFL teams...');
    const teamsResponse = await fetch(
      `https://v1.american-football.api-sports.io/teams?league=1&season=${season}`,
      {
        headers: {
          'x-apisports-key': apiSportsKey,
        },
      }
    );

    if (!teamsResponse.ok) {
      throw new Error(`Failed to fetch teams: ${teamsResponse.status}`);
    }

    const teamsData = await teamsResponse.json();
    const teams = teamsData.response || [];
    console.log(`Found ${teams.length} teams for season ${season}`);

    let totalFetched = 0;
    let offensivePlayers = 0;
    let upsertedCount = 0;
    const errors: string[] = [];

    // Fetch players for each team
    for (const team of teams) {
      const teamId = team.id;
      const teamName = team.name;
      const teamAbbr = team.code || team.abbreviation || null;

      console.log(`Fetching players for team: ${teamName} (ID: ${teamId})`);

      const playersResponse = await fetch(
        `https://v1.american-football.api-sports.io/players?team=${teamId}&season=${season}`,
        {
          headers: {
            'x-apisports-key': apiSportsKey,
          },
        }
      );

      if (!playersResponse.ok) {
        const errorMsg = `Failed to fetch players for team ${teamName}: ${playersResponse.status}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        continue;
      }

      const playersData = await playersResponse.json();
      const players = playersData.response || [];
      totalFetched += players.length;

      // Filter and process offensive players
      const offensivePlayersForTeam = players.filter((p: any) => 
        OFFENSIVE_POSITIONS.includes(p.position)
      );

      console.log(`  Found ${players.length} total players, ${offensivePlayersForTeam.length} offensive`);

      for (const p of offensivePlayersForTeam) {
        offensivePlayers++;

        const apiPlayerId = p.id?.toString();
        if (!apiPlayerId) {
          console.warn('Skipping player without ID:', p.name);
          continue;
        }

        const firstName = p.first_name ?? p.firstname ?? null;
        const lastName = p.last_name ?? p.lastname ?? null;
        const fullName = p.name ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();
        const position = p.position;
        const jerseyNumber = p.jersey?.toString() ?? p.number?.toString() ?? null;
        const status = p.status ?? p.injury_status ?? null;
        const playerGroup = p.group ?? null; // e.g. "Offense", "Practice Squad", "Injured Reserve Or O"
        
        // Extract image URL - API returns image field, filter out placeholder images
        let imageUrl = p.image ?? null;
        if (imageUrl && (imageUrl.includes('/0.png') || imageUrl.includes('players/0'))) {
          imageUrl = null; // Filter out placeholder images
        }

        const { error } = await supabase
          .from('players')
          .upsert({
            season,
            api_player_id: apiPlayerId,
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            position,
            team_api_id: teamId.toString(),
            team_name: teamName,
            team_abbr: teamAbbr,
            jersey_number: jerseyNumber,
            status,
            image_url: imageUrl,
            group: playerGroup
          }, {
            onConflict: 'season,api_player_id'
          });

        if (error) {
          console.error('Error upserting player', apiPlayerId, error);
          errors.push(`Player ${fullName}: ${error.message}`);
        } else {
          upsertedCount++;
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      success: true,
      season,
      totalTeams: teams.length,
      totalPlayersFetched: totalFetched,
      offensivePlayersFound: offensivePlayers,
      playersUpserted: upsertedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    };

    console.log('Sync complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-season-players:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

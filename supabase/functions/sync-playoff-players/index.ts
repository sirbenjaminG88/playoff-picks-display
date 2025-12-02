import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayerResponse {
  id: number;
  name: string;
  position: string;
  group: string;
  number: string;
  image: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiSportsKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiSportsKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    const season = 2024;
    const league = 1; // NFL

    console.log(`Fetching playoff teams for season ${season}...`);

    // Step 1: Get all playoff teams for 2024
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: playoffTeams, error: teamsError } = await supabase
      .from('playoff_teams')
      .select('team_id, name')
      .eq('season', season)
      .eq('made_playoffs', true);

    if (teamsError) {
      console.error('Error fetching playoff teams:', teamsError);
      throw teamsError;
    }

    if (!playoffTeams || playoffTeams.length === 0) {
      throw new Error('No playoff teams found for season 2024');
    }

    console.log(`Found ${playoffTeams.length} playoff teams`);

    // Step 2: Fetch players for each team
    const allPlayers: any[] = [];
    const validPositions = ['QB', 'RB', 'WR', 'TE'];

    for (const team of playoffTeams) {
      console.log(`Fetching players for ${team.name} (team_id: ${team.team_id})...`);

      try {
        const response = await fetch(
          `https://v1.american-football.api-sports.io/players?team=${team.team_id}&season=${season}&league=${league}`,
          {
            headers: {
              'x-apisports-key': apiSportsKey,
            },
          }
        );

        console.log(`API Response Status for team ${team.team_id}: ${response.status}`);

        if (!response.ok) {
          console.error(`API request failed for team ${team.team_id}: ${response.statusText}`);
          const errorText = await response.text();
          console.error(`Error response body: ${errorText}`);
          continue;
        }

        const data = await response.json();
        console.log(`API Response structure for ${team.name}:`, JSON.stringify(data, null, 2));
        
        const players = data.response || [];

        console.log(`Received ${players.length} total players for ${team.name}`);

        // Filter for QB, RB, WR, TE positions
        const filteredPlayers = players
          .filter((player: PlayerResponse) => validPositions.includes(player.position))
          .map((player: PlayerResponse) => ({
            player_id: player.id,
            name: player.name,
            position: player.position,
            group: player.group,
            number: player.number,
            team_id: team.team_id,
            team_name: team.name,
            season: season,
            image_url: player.image,
          }));

        console.log(`Filtered to ${filteredPlayers.length} QB/RB/WR/TE players for ${team.name}`);
        allPlayers.push(...filteredPlayers);
      } catch (error) {
        console.error(`Error fetching players for team ${team.team_id}:`, error);
        // Continue with other teams
      }
    }

    console.log(`Total players to sync: ${allPlayers.length}`);

    if (allPlayers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          playersSynced: 0,
          teamsProcessed: playoffTeams.length,
          message: 'No players found to sync',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 3: Upsert players into database
    const { data: insertedPlayers, error: insertError } = await supabase
      .from('playoff_players')
      .upsert(allPlayers, {
        onConflict: 'player_id,season',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log(`Successfully synced ${insertedPlayers?.length || 0} playoff players`);

    return new Response(
      JSON.stringify({
        success: true,
        playersSynced: insertedPlayers?.length || 0,
        teamsProcessed: playoffTeams.length,
        positionBreakdown: {
          QB: allPlayers.filter(p => p.position === 'QB').length,
          RB: allPlayers.filter(p => p.position === 'RB').length,
          WR: allPlayers.filter(p => p.position === 'WR').length,
          TE: allPlayers.filter(p => p.position === 'TE').length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing playoff players:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

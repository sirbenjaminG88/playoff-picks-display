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
    const team_id = 26; // Houston Texans

    console.log(`Testing API call for team_id: ${team_id}, season: ${season}, league: ${league}`);

    const response = await fetch(
      `https://v1.american-football.api-sports.io/players?team=${team_id}&season=${season}&league=${league}`,
      {
        headers: {
          'x-apisports-key': apiSportsKey,
        },
      }
    );

    console.log(`API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`API Response structure:`, JSON.stringify(data, null, 2));
    
    const allPlayers = data.response || [];
    console.log(`Total players returned: ${allPlayers.length}`);

    const validPositions = ['QB', 'RB', 'WR', 'TE'];
    const filteredPlayers = allPlayers
      .filter((player: PlayerResponse) => validPositions.includes(player.position))
      .map((player: PlayerResponse) => ({
        player_id: player.id,
        name: player.name,
        position: player.position,
        group: player.group,
        number: player.number,
        image_url: player.image,
      }));

    const positionsBreakdown = {
      QB: filteredPlayers.filter((p: any) => p.position === 'QB').length,
      RB: filteredPlayers.filter((p: any) => p.position === 'RB').length,
      WR: filteredPlayers.filter((p: any) => p.position === 'WR').length,
      TE: filteredPlayers.filter((p: any) => p.position === 'TE').length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        team_id: team_id,
        season: season,
        total_players: filteredPlayers.length,
        positions_breakdown: positionsBreakdown,
        players: filteredPlayers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in test-playoff-team-players:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const gameId = url.searchParams.get('game_id');
    const playerId = url.searchParams.get('player_id');

    if (!gameId || !playerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required params: game_id and player_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiKey) {
      console.error('API_SPORTS_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://v1.american-football.api-sports.io/games/statistics/players?id=${gameId}&player=${playerId}`;
    console.log(`Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'x-apisports-key': apiKey,
        'accept': 'application/json',
      },
    });

    const data = await response.json();
    
    // Log full response for debugging
    console.log('API Response:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify(data, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

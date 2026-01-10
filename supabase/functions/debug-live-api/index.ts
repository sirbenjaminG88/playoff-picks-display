import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('API_SPORTS_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No API key' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const gameId = url.searchParams.get('game_id') || '21459';
  const playerId = url.searchParams.get('player_id') || '17559';

  const results: any = {
    timestamp: new Date().toISOString(),
    gameId,
    playerId,
  };

  // Test 1: Get game status
  try {
    const gameResp = await fetch(
      `https://v1.american-football.api-sports.io/games?id=${gameId}`,
      {
        headers: {
          'x-apisports-key': apiKey,
          'accept': 'application/json',
        },
      }
    );
    results.gameStatus = await gameResp.json();
  } catch (e) {
    results.gameStatusError = String(e);
  }

  // Test 2: Get player stats for game
  try {
    const statsResp = await fetch(
      `https://v1.american-football.api-sports.io/games/statistics/players?id=${gameId}&player=${playerId}`,
      {
        headers: {
          'x-apisports-key': apiKey,
          'accept': 'application/json',
        },
      }
    );
    results.playerStats = await statsResp.json();
  } catch (e) {
    results.playerStatsError = String(e);
  }

  // Test 3: Get game statistics (team level)
  try {
    const gameStatsResp = await fetch(
      `https://v1.american-football.api-sports.io/games/statistics/teams?id=${gameId}`,
      {
        headers: {
          'x-apisports-key': apiKey,
          'accept': 'application/json',
        },
      }
    );
    results.gameStats = await gameStatsResp.json();
  } catch (e) {
    results.gameStatsError = String(e);
  }

  // Test 4: Check all live games
  try {
    const liveResp = await fetch(
      `https://v1.american-football.api-sports.io/games?live=all`,
      {
        headers: {
          'x-apisports-key': apiKey,
          'accept': 'application/json',
        },
      }
    );
    results.liveGames = await liveResp.json();
  } catch (e) {
    results.liveGamesError = String(e);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

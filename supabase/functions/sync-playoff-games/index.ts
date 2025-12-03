import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameResponse {
  game: {
    id: number;
    stage: string;
    week: string;
    date: {
      timezone: string;
      date: string;
      time: string;
      timestamp: number;
    };
    venue: {
      name: string;
      city: string;
    };
    status: {
      short: string;
      long: string;
      timer: string | null;
    };
  };
  league: {
    id: number;
    name: string;
    season: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
}

// Map week labels to week_index
function getWeekIndex(weekLabel: string): number | null {
  const mapping: Record<string, number> = {
    'Wild Card': 1,
    'Divisional Round': 2,
    'Conference Championships': 3,
    'Super Bowl': 4,
  };
  return mapping[weekLabel] ?? null;
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

    console.log('Fetching 2024 NFL postseason games for schedule...');

    // Step 1: Call API-Sports for 2024 NFL games
    const response = await fetch(
      'https://v1.american-football.api-sports.io/games?season=2024&league=1',
      {
        headers: {
          'x-apisports-key': apiSportsKey,
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API-Sports request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.response?.length || 0} games from API`);

    // Step 2: Filter for Post Season games only
    const validPlayoffWeeks = ['Wild Card', 'Divisional Round', 'Conference Championships', 'Super Bowl'];
    
    const playoffGames = (data.response || []).filter((game: GameResponse) => {
      return (
        game.game.stage === 'Post Season' &&
        validPlayoffWeeks.includes(game.game.week)
      );
    });

    console.log(`Filtered to ${playoffGames.length} playoff games`);

    // Step 3: Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 4: Get all playoff teams to validate games
    const { data: playoffTeams, error: teamsError } = await supabase
      .from('playoff_teams')
      .select('team_id')
      .eq('season', 2024);

    if (teamsError) {
      throw new Error(`Failed to fetch playoff teams: ${teamsError.message}`);
    }

    const playoffTeamIds = new Set((playoffTeams || []).map(t => t.team_id));
    console.log(`Found ${playoffTeamIds.size} playoff teams in database`);

    // Step 5: Process and upsert games
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const skippedGames: string[] = [];

    for (const gameData of playoffGames as GameResponse[]) {
      const homeTeamId = gameData.teams.home.id;
      const awayTeamId = gameData.teams.away.id;
      
      // Skip if either team is not in our playoff teams
      if (!playoffTeamIds.has(homeTeamId) || !playoffTeamIds.has(awayTeamId)) {
        skipped++;
        skippedGames.push(`${gameData.teams.away.name} @ ${gameData.teams.home.name} (missing team)`);
        continue;
      }

      const weekIndex = getWeekIndex(gameData.game.week);
      if (weekIndex === null) {
        skipped++;
        skippedGames.push(`${gameData.teams.away.name} @ ${gameData.teams.home.name} (unknown week: ${gameData.game.week})`);
        continue;
      }

      // Parse kickoff time
      const kickoffAt = gameData.game.date.date && gameData.game.date.time
        ? `${gameData.game.date.date}T${gameData.game.date.time}:00Z`
        : null;

      const gameRecord = {
        season: parseInt(gameData.league.season, 10),
        week_index: weekIndex,
        week_label: gameData.game.week,
        stage: gameData.game.stage,
        game_id: gameData.game.id,
        home_team_external_id: homeTeamId,
        away_team_external_id: awayTeamId,
        kickoff_at: kickoffAt,
        venue_name: gameData.game.venue?.name || null,
        venue_city: gameData.game.venue?.city || null,
        home_score: gameData.scores.home?.total ?? null,
        away_score: gameData.scores.away?.total ?? null,
        status_short: gameData.game.status?.short || null,
        status_long: gameData.game.status?.long || null,
        updated_at: new Date().toISOString(),
      };

      // Check if game exists
      const { data: existing } = await supabase
        .from('playoff_games')
        .select('id')
        .eq('season', gameRecord.season)
        .eq('game_id', gameRecord.game_id)
        .single();

      if (existing) {
        // Update existing game
        const { error: updateError } = await supabase
          .from('playoff_games')
          .update(gameRecord)
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Failed to update game ${gameRecord.game_id}:`, updateError);
        } else {
          updated++;
        }
      } else {
        // Insert new game
        const { error: insertError } = await supabase
          .from('playoff_games')
          .insert(gameRecord);

        if (insertError) {
          console.error(`Failed to insert game ${gameRecord.game_id}:`, insertError);
        } else {
          inserted++;
        }
      }
    }

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        season: 2024,
        totalGamesFromApi: playoffGames.length,
        inserted,
        updated,
        skipped,
        skippedGames: skippedGames.length > 0 ? skippedGames : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing playoff games:', error);
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

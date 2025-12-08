import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Team {
  id: number;
  name: string;
  logo: string;
}

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
    home: Team;
    away: Team;
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

// Helper to verify admin role
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { authorized: false, error: 'Invalid user token' };
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !isAdmin) {
    console.log(`User ${user.id} is not an admin`);
    return { authorized: false, error: 'User is not an admin' };
  }

  console.log(`Admin verified: ${user.id}`);
  return { authorized: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const { authorized, error: authError } = await verifyAdmin(req);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiSportsKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiSportsKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    const SEASON = 2025;
    console.log(`Fetching ${SEASON} NFL postseason schedule...`);

    // Step 1: Call API-Sports for 2025 NFL games
    const response = await fetch(
      `https://v1.american-football.api-sports.io/games?season=${SEASON}&league=1`,
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
        game.game.week !== 'Pro Bowl' &&
        validPlayoffWeeks.includes(game.game.week)
      );
    });

    console.log(`Filtered to ${playoffGames.length} playoff games`);

    // If no playoff games found, the schedule might not be published yet
    if (playoffGames.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `No ${SEASON} playoff games found yet. The schedule may not be published until closer to playoffs (mid-January 2026).`,
          season: SEASON,
          totalGamesFromApi: data.response?.length || 0,
          playoffGamesFound: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 3: Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 4: Extract and upsert unique playoff teams
    const teamsMap = new Map<number, { team_id: number; name: string; logo_url: string }>();

    playoffGames.forEach((game: GameResponse) => {
      if (game.teams.home?.id) {
        teamsMap.set(game.teams.home.id, {
          team_id: game.teams.home.id,
          name: game.teams.home.name,
          logo_url: game.teams.home.logo,
        });
      }
      if (game.teams.away?.id) {
        teamsMap.set(game.teams.away.id, {
          team_id: game.teams.away.id,
          name: game.teams.away.name,
          logo_url: game.teams.away.logo,
        });
      }
    });

    const uniqueTeams = Array.from(teamsMap.values());
    console.log(`Extracted ${uniqueTeams.length} unique playoff teams`);

    // Upsert teams
    const { data: insertedTeams, error: teamsError } = await supabase
      .from('playoff_teams')
      .upsert(
        uniqueTeams.map(team => ({
          team_id: team.team_id,
          name: team.name,
          logo_url: team.logo_url,
          season: SEASON,
          made_playoffs: true,
        })),
        {
          onConflict: 'team_id,season',
          ignoreDuplicates: false,
        }
      )
      .select();

    if (teamsError) {
      console.error('Teams upsert error:', teamsError);
      throw teamsError;
    }

    console.log(`Synced ${insertedTeams?.length || 0} playoff teams`);

    // Step 5: Get playoff team IDs for validation
    const playoffTeamIds = new Set(uniqueTeams.map(t => t.team_id));

    // Step 6: Process and upsert games
    let gamesInserted = 0;
    let gamesUpdated = 0;
    let gamesSkipped = 0;
    const skippedGames: string[] = [];

    for (const gameData of playoffGames as GameResponse[]) {
      const homeTeamId = gameData.teams.home.id;
      const awayTeamId = gameData.teams.away.id;
      
      if (!playoffTeamIds.has(homeTeamId) || !playoffTeamIds.has(awayTeamId)) {
        gamesSkipped++;
        skippedGames.push(`${gameData.teams.away.name} @ ${gameData.teams.home.name} (missing team)`);
        continue;
      }

      const weekIndex = getWeekIndex(gameData.game.week);
      if (weekIndex === null) {
        gamesSkipped++;
        skippedGames.push(`${gameData.teams.away.name} @ ${gameData.teams.home.name} (unknown week: ${gameData.game.week})`);
        continue;
      }

      // Parse kickoff time
      const kickoffAt = gameData.game.date.date && gameData.game.date.time
        ? `${gameData.game.date.date}T${gameData.game.date.time}:00Z`
        : null;

      const gameRecord = {
        season: SEASON,
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
        .eq('season', SEASON)
        .eq('game_id', gameRecord.game_id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('playoff_games')
          .update(gameRecord)
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Failed to update game ${gameRecord.game_id}:`, updateError);
        } else {
          gamesUpdated++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('playoff_games')
          .insert(gameRecord);

        if (insertError) {
          console.error(`Failed to insert game ${gameRecord.game_id}:`, insertError);
        } else {
          gamesInserted++;
        }
      }
    }

    console.log(`Games sync complete: ${gamesInserted} inserted, ${gamesUpdated} updated, ${gamesSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        season: SEASON,
        teams: {
          found: uniqueTeams.length,
          synced: insertedTeams?.length || 0,
        },
        games: {
          found: playoffGames.length,
          inserted: gamesInserted,
          updated: gamesUpdated,
          skipped: gamesSkipped,
        },
        skippedGames: skippedGames.length > 0 ? skippedGames : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing 2025 playoff schedule:', error);
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

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
    home: { id: number; name: string; code?: string };
    away: { id: number; name: string; code?: string };
  };
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
}

// Team abbreviation mapping for common NFL teams
const teamAbbrMap: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
};

function getTeamAbbr(teamName: string, code?: string): string | null {
  if (code) return code;
  return teamAbbrMap[teamName] || null;
}

// Parse week number from strings like "Week 14" or just "14"
function parseWeekNumber(weekStr: string): number | null {
  if (!weekStr) return null;
  const match = weekStr.match(/Week\s*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  const num = parseInt(weekStr, 10);
  return isNaN(num) ? null : num;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const SEASON = 2025;
    const WEEKS = [14, 15, 16, 17, 18];

    console.log(`Fetching ${SEASON} NFL regular season games for weeks ${WEEKS.join(', ')}...`);

    // Fetch all games for the 2025 season
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
    console.log(`Received ${data.response?.length || 0} total games from API`);

    // Log the stage types present in the data for debugging
    const stages = new Set((data.response || []).map((g: GameResponse) => g.game.stage));
    console.log('Available stages in API response:', Array.from(stages));
    
    // Sample weeks from the data
    const weekSamples = (data.response || []).slice(0, 20).map((g: GameResponse) => ({
      week: g.game.week,
      stage: g.game.stage,
      teams: `${g.teams.away.name} @ ${g.teams.home.name}`
    }));
    console.log('Sample games:', JSON.stringify(weekSamples, null, 2));

    // Filter for Regular Season games in weeks 14-18
    const regularSeasonGames = (data.response || []).filter((game: GameResponse) => {
      const weekNum = parseWeekNumber(game.game.week);
      const isRegularSeason = game.game.stage === 'Regular Season';
      return (
        isRegularSeason &&
        weekNum !== null &&
        weekNum >= 14 &&
        weekNum <= 18
      );
    });

    console.log(`Filtered to ${regularSeasonGames.length} regular season games for weeks 14-18`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const gameData of regularSeasonGames as GameResponse[]) {
      const weekNum = parseWeekNumber(gameData.game.week)!;

      // Parse kickoff time
      const gameDate = gameData.game.date.date && gameData.game.date.time
        ? `${gameData.game.date.date}T${gameData.game.date.time}:00Z`
        : null;

      const gameRecord = {
        season: SEASON,
        week: weekNum,
        season_type: 'REG',
        api_game_id: gameData.game.id,
        game_date: gameDate,
        home_team_api_id: gameData.teams.home.id,
        home_team_name: gameData.teams.home.name,
        home_team_abbr: getTeamAbbr(gameData.teams.home.name, gameData.teams.home.code),
        away_team_api_id: gameData.teams.away.id,
        away_team_name: gameData.teams.away.name,
        away_team_abbr: getTeamAbbr(gameData.teams.away.name, gameData.teams.away.code),
        venue: gameData.game.venue?.name || null,
        status: gameData.game.status?.long || gameData.game.status?.short || 'scheduled',
      };

      // Upsert game
      const { data: existing, error: selectError } = await supabase
        .from('regular_season_games')
        .select('id')
        .eq('season', SEASON)
        .eq('api_game_id', gameRecord.api_game_id)
        .maybeSingle();

      if (selectError) {
        console.error(`Error checking game ${gameRecord.api_game_id}:`, selectError);
        errors++;
        continue;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('regular_season_games')
          .update({ ...gameRecord, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Failed to update game ${gameRecord.api_game_id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('regular_season_games')
          .insert(gameRecord);

        if (insertError) {
          console.error(`Failed to insert game ${gameRecord.api_game_id}:`, insertError);
          errors++;
        } else {
          inserted++;
        }
      }
    }

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        season: SEASON,
        weeks: WEEKS,
        totalGamesFromApi: regularSeasonGames.length,
        inserted,
        updated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing regular season games:', error);
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

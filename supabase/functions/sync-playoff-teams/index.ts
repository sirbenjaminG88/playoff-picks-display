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

interface Game {
  game: {
    stage: string;
    week: string;
  };
  teams: {
    home: Team;
    away: Team;
  };
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

  // Check admin role using the has_role function
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
  // Handle CORS preflight requests
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

    console.log('Fetching 2024 NFL postseason games...');

    // Step 1: Call API-Sports for 2024 NFL postseason games
    const response = await fetch(
      'https://v1.american-football.api-sports.io/games?season=2024&league=1&timezone=UTC',
      {
        headers: {
          'x-apisports-key': apiSportsKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API-Sports request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received ${data.response?.length || 0} games from API`);

    // Step 2: Filter for Post Season games only (exclude Pro Bowl)
    const validPlayoffWeeks = ['Wild Card', 'Divisional Round', 'Conference Championships', 'Super Bowl'];
    
    const playoffGames = (data.response || []).filter((game: Game) => {
      return (
        game.game.stage === 'Post Season' &&
        game.game.week !== 'Pro Bowl' &&
        validPlayoffWeeks.includes(game.game.week)
      );
    });

    console.log(`Filtered to ${playoffGames.length} playoff games`);

    // Step 3: Extract unique teams
    const teamsMap = new Map<number, { team_id: number; name: string; logo_url: string }>();

    playoffGames.forEach((game: Game) => {
      // Add home team
      if (game.teams.home && game.teams.home.id) {
        teamsMap.set(game.teams.home.id, {
          team_id: game.teams.home.id,
          name: game.teams.home.name,
          logo_url: game.teams.home.logo,
        });
      }

      // Add away team
      if (game.teams.away && game.teams.away.id) {
        teamsMap.set(game.teams.away.id, {
          team_id: game.teams.away.id,
          name: game.teams.away.name,
          logo_url: game.teams.away.logo,
        });
      }
    });

    const uniqueTeams = Array.from(teamsMap.values());
    console.log(`Extracted ${uniqueTeams.length} unique playoff teams`);

    // Step 4: Insert into database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use upsert to handle duplicates
    const { data: insertedTeams, error: insertError } = await supabase
      .from('playoff_teams')
      .upsert(
        uniqueTeams.map(team => ({
          team_id: team.team_id,
          name: team.name,
          logo_url: team.logo_url,
          season: 2024,
          made_playoffs: true,
        })),
        {
          onConflict: 'team_id',
          ignoreDuplicates: false,
        }
      )
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log(`Successfully synced ${insertedTeams?.length || 0} playoff teams`);

    return new Response(
      JSON.stringify({
        success: true,
        gamesFound: playoffGames.length,
        teamsExtracted: uniqueTeams.length,
        teamsSynced: insertedTeams?.length || 0,
        teams: insertedTeams,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing playoff teams:', error);
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

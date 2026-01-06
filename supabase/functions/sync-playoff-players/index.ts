import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify admin role
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use service role client for admin verification
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate token using getUser with the JWT
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    console.error('Token validation failed:', userError);
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
  return { authorized: true, userId: user.id };
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

    const season = 2025;

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
    let withImages = 0;

    for (const team of playoffTeams) {
      console.log(`Fetching players for ${team.name} (team_id: ${team.team_id})...`);

      try {
        const response = await fetch(
          `https://v1.american-football.api-sports.io/players?team=${team.team_id}&season=${season}`,
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
        const players = data.response || [];

        console.log(`Received ${players.length} total players for ${team.name}`);

        // Filter for QB, RB, WR, TE positions - store raw image URL without filtering
        for (const player of players) {
          if (!validPositions.includes(player.position)) continue;
          
          // Store the raw image URL from API without any filtering
          const imageUrl = player.image ?? null;
          const hasHeadshot = !!imageUrl;
          
          if (imageUrl) {
            withImages++;
          }
          
          allPlayers.push({
            player_id: player.id,
            name: player.name,
            position: player.position,
            group: player.group,
            number: player.number,
            team_id: team.team_id,
            team_name: team.name,
            season: season,
            image_url: imageUrl,
            has_headshot: hasHeadshot,
          });
        }

        console.log(`Filtered to ${allPlayers.filter(p => p.team_id === team.team_id).length} QB/RB/WR/TE players for ${team.name}`);
      } catch (error) {
        console.error(`Error fetching players for team ${team.team_id}:`, error);
        // Continue with other teams
      }
    }

    console.log(`Total players to sync: ${allPlayers.length}`);
    console.log(`Players with images: ${withImages}`);

    if (allPlayers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          playersSynced: 0,
          teamsProcessed: playoffTeams.length,
          playersWithImages: withImages,
          message: 'No players found to sync',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 3: Upsert players into database
    // Process in batches to avoid duplicate key issues within same upsert
    const uniquePlayers = new Map<string, any>();
    for (const player of allPlayers) {
      const key = `${player.team_id}-${player.season}-${player.player_id}`;
      uniquePlayers.set(key, player);
    }
    const dedupedPlayers = Array.from(uniquePlayers.values());

    console.log(`Deduped to ${dedupedPlayers.length} unique players`);

    const { data: insertedPlayers, error: insertError } = await supabase
      .from('playoff_players')
      .upsert(dedupedPlayers, {
        onConflict: 'team_id,season,player_id',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    const syncedCount = insertedPlayers?.length || dedupedPlayers.length;
    console.log(`Successfully synced ${syncedCount} playoff players`);

    return new Response(
      JSON.stringify({
        success: true,
        playersSynced: syncedCount,
        teamsProcessed: playoffTeams.length,
        playersWithImages: withImages,
        positionBreakdown: {
          QB: dedupedPlayers.filter(p => p.position === 'QB').length,
          RB: dedupedPlayers.filter(p => p.position === 'RB').length,
          WR: dedupedPlayers.filter(p => p.position === 'WR').length,
          TE: dedupedPlayers.filter(p => p.position === 'TE').length,
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

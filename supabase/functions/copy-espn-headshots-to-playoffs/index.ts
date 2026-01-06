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
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const season = 2025;

    console.log(`Copying ESPN headshots to playoff_players for season ${season}...`);

    // Step 1: Get all playoff players for the season
    const { data: playoffPlayers, error: ppError } = await supabase
      .from('playoff_players')
      .select('id, player_id, name, image_url')
      .eq('season', season);

    if (ppError) {
      console.error('Error fetching playoff players:', ppError);
      throw ppError;
    }

    console.log(`Found ${playoffPlayers?.length || 0} playoff players`);

    // Step 2: Get all players with ESPN headshots
    const { data: espnPlayers, error: epError } = await supabase
      .from('players')
      .select('api_player_id, espn_headshot_url, full_name')
      .eq('season', season)
      .not('espn_headshot_url', 'is', null);

    if (epError) {
      console.error('Error fetching ESPN players:', epError);
      throw epError;
    }

    console.log(`Found ${espnPlayers?.length || 0} players with ESPN headshots`);

    // Step 3: Build a map of player_id -> espn_headshot_url
    const espnMap = new Map<number, string>();
    for (const p of espnPlayers || []) {
      const playerId = parseInt(p.api_player_id, 10);
      if (!isNaN(playerId) && p.espn_headshot_url) {
        espnMap.set(playerId, p.espn_headshot_url);
      }
    }

    console.log(`Built ESPN map with ${espnMap.size} entries`);

    // Step 4: Update playoff_players with ESPN headshots
    let updated = 0;
    let skipped = 0;
    let alreadyHasEspn = 0;

    for (const pp of playoffPlayers || []) {
      const espnUrl = espnMap.get(pp.player_id);
      
      if (!espnUrl) {
        skipped++;
        continue;
      }

      // Check if already has ESPN URL
      if (pp.image_url && pp.image_url.includes('espncdn.com')) {
        alreadyHasEspn++;
        continue;
      }

      // Update with ESPN headshot
      const { error: updateError } = await supabase
        .from('playoff_players')
        .update({ image_url: espnUrl })
        .eq('id', pp.id);

      if (updateError) {
        console.error(`Error updating player ${pp.player_id}:`, updateError);
        continue;
      }

      updated++;
    }

    console.log(`Updated ${updated} playoff players with ESPN headshots`);
    console.log(`Skipped ${skipped} (no ESPN match), ${alreadyHasEspn} already had ESPN`);

    return new Response(
      JSON.stringify({
        success: true,
        season,
        totalPlayoffPlayers: playoffPlayers?.length || 0,
        espnPlayersAvailable: espnMap.size,
        updated,
        skipped,
        alreadyHadEspn: alreadyHasEspn,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error copying ESPN headshots:', error);
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

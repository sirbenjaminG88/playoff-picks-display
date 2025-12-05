import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SHA-256 hash of the known API-Sports placeholder headshot image.
 * This was computed from: https://media.api-sports.io/american-football/players/14251.png
 * (Marvin Harrison Jr. - confirmed placeholder image)
 * 
 * Any player image that hashes to this value is a placeholder, not a real photo.
 */
const PLACEHOLDER_HEADSHOT_SHA256 = '72f0bbb253ab54961cd5d66148e55aceb3e6bc9823da43e57a6e0812e5427430';

/**
 * Compute SHA-256 hash of image data and return lowercase hex string.
 */
async function computeImageHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

serve(async (req) => {
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

    // Parse optional limit from request body (default 100 for hash-based audit)
    let limit = 100;
    try {
      const body = await req.json();
      if (body.limit && typeof body.limit === 'number' && body.limit > 0) {
        limit = Math.min(body.limit, 200); // Cap at 200 for safety with image fetching
      }
    } catch {
      // Use default limit
    }

    console.log(`Starting hash-based headshot audit with limit=${limit}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch players that need auditing:
    // - headshot_status is 'unknown' or 'no_url' (re-audit those)
    // - image_url is NOT NULL (we need something to fetch)
    // - Only offensive players that can be picked
    // Note: status can be NULL (allowed) or anything except 'Practice Squad%'
    const { data: players, error: fetchError } = await supabase
      .from('players')
      .select('id, full_name, image_url, headshot_status')
      .eq('season', 2025)
      .eq('group', 'Offense')
      .in('headshot_status', ['unknown', 'no_url'])
      .not('image_url', 'is', null)
      .order('id')
      .limit(limit);

    if (fetchError) {
      console.error('Error fetching players:', fetchError);
      throw fetchError;
    }

    if (!players || players.length === 0) {
      // Get count of remaining unknown players
      const { count: remainingCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .in('headshot_status', ['unknown', 'no_url'])
        .not('image_url', 'is', null);

      console.log('No players to audit');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          markedPlaceholder: 0,
          markedOk: 0,
          remainingUnknown: remainingCount ?? 0,
          message: 'No players need auditing',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${players.length} players to audit via hash comparison`);

    // Counters for summary
    let markedOk = 0;
    let markedPlaceholder = 0;
    let fetchErrors = 0;

    // Process each player
    for (const player of players) {
      try {
        console.log(`Auditing ${player.full_name} (${player.id}): ${player.image_url}`);
        
        // Fetch the image
        const response = await fetch(player.image_url);
        
        if (!response.ok) {
          console.warn(`headshot audit failed for player ${player.id}: HTTP ${response.status}`);
          fetchErrors++;
          continue; // Leave headshot_status unchanged
        }

        // Read as binary and compute hash
        const buffer = await response.arrayBuffer();
        const hash = await computeImageHash(buffer);
        
        console.log(`  Hash: ${hash} (size: ${buffer.byteLength} bytes)`);

        if (hash === PLACEHOLDER_HEADSHOT_SHA256) {
          // This is the placeholder image
          console.log(`  -> PLACEHOLDER detected`);
          const { error } = await supabase
            .from('players')
            .update({ headshot_status: 'placeholder', has_headshot: false })
            .eq('id', player.id);

          if (error) {
            console.error(`Error updating player ${player.id}:`, error);
            fetchErrors++;
          } else {
            markedPlaceholder++;
          }
        } else {
          // Real headshot
          console.log(`  -> OK (real photo)`);
          const { error } = await supabase
            .from('players')
            .update({ headshot_status: 'ok', has_headshot: true })
            .eq('id', player.id);

          if (error) {
            console.error(`Error updating player ${player.id}:`, error);
            fetchErrors++;
          } else {
            markedOk++;
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`headshot audit failed for player ${player.id}:`, errMsg);
        fetchErrors++;
        // Leave headshot_status unchanged - don't touch image_url
      }
    }

    // Get remaining count
    const { count: remainingCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('season', 2025)
      .eq('group', 'Offense')
      .in('headshot_status', ['unknown', 'no_url'])
      .not('image_url', 'is', null);

    const summary = {
      success: true,
      processed: players.length,
      markedPlaceholder,
      markedOk,
      fetchErrors,
      remainingUnknown: remainingCount ?? 0,
    };

    console.log(`audit-player-headshots completed:`, summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in audit-player-headshots:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

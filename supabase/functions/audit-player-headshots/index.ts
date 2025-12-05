import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Placeholder URL Detection Pattern:
 * 
 * API-Sports uses a specific placeholder image for players without headshots:
 * - Pattern: https://media.api-sports.io/american-football/players/0.png
 * - The key indicator is "/players/0.png" or ending with "/0.png"
 * 
 * This function uses URL pattern matching ONLY - no HEAD requests or content-length checks.
 * This is intentionally conservative to avoid false positives.
 */
function isPlaceholderUrl(imageUrl: string): boolean {
  if (!imageUrl) return false;
  
  // Check for the known API-Sports placeholder pattern
  // The placeholder uses player ID "0" which is not a real player
  if (imageUrl.includes('/players/0.png') || imageUrl.endsWith('/0.png')) {
    return true;
  }
  
  return false;
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

    // Parse optional limit from request body
    let limit = 200;
    try {
      const body = await req.json();
      if (body.limit && typeof body.limit === 'number' && body.limit > 0) {
        limit = Math.min(body.limit, 500); // Cap at 500 for safety
      }
    } catch {
      // Use default limit
    }

    console.log(`Starting headshot audit with limit=${limit}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch players that need auditing
    // Only offensive players that can be picked (not practice squad)
    const { data: players, error: fetchError } = await supabase
      .from('players')
      .select('id, full_name, image_url, headshot_status')
      .eq('season', 2025)
      .eq('group', 'Offense')
      .not('status', 'ilike', 'Practice Squad%')
      .in('headshot_status', ['unknown', 'placeholder_guess'])
      .limit(limit);

    if (fetchError) {
      console.error('Error fetching players:', fetchError);
      throw fetchError;
    }

    if (!players || players.length === 0) {
      console.log('No players to audit');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No players need auditing',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${players.length} players to audit`);

    // Counters for summary
    let okCount = 0;
    let placeholderGuessCount = 0;
    let noUrlCount = 0;
    let errorCount = 0;

    // Process each player
    for (const player of players) {
      try {
        if (!player.image_url) {
          // No URL - mark as no_url
          const { error } = await supabase
            .from('players')
            .update({ headshot_status: 'no_url', has_headshot: false })
            .eq('id', player.id);

          if (error) {
            console.error(`Error updating player ${player.id}:`, error);
            errorCount++;
          } else {
            noUrlCount++;
          }
        } else if (isPlaceholderUrl(player.image_url)) {
          // URL matches placeholder pattern
          // IMPORTANT: We do NOT modify image_url, only the status fields
          const { error } = await supabase
            .from('players')
            .update({ headshot_status: 'placeholder_guess', has_headshot: false })
            .eq('id', player.id);

          if (error) {
            console.error(`Error updating player ${player.id}:`, error);
            errorCount++;
          } else {
            placeholderGuessCount++;
            console.log(`Placeholder detected for ${player.full_name}: ${player.image_url}`);
          }
        } else {
          // URL looks like a real headshot
          const { error } = await supabase
            .from('players')
            .update({ headshot_status: 'ok', has_headshot: true })
            .eq('id', player.id);

          if (error) {
            console.error(`Error updating player ${player.id}:`, error);
            errorCount++;
          } else {
            okCount++;
          }
        }
      } catch (err) {
        console.error(`Exception processing player ${player.id}:`, err);
        errorCount++;
      }
    }

    const summary = {
      success: true,
      processed: players.length,
      ok: okCount,
      placeholder_guess: placeholderGuessCount,
      no_url: noUrlCount,
      errors: errorCount,
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

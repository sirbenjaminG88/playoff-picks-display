import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayerResult {
  name: string;
  found: boolean;
  espnId: string | null;
  headshotUrl: string | null;
  imageBytes: number;
  error: string | null;
}

// Helper to verify admin
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { authorized: false, error: 'Invalid or expired token' };
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !isAdmin) {
    return { authorized: false, error: 'User is not an admin' };
  }

  return { authorized: true };
}

async function searchEspnPlayer(playerName: string): Promise<{ espnId: string | null; headshotUrl: string | null; error: string | null }> {
  const encodedName = encodeURIComponent(playerName);
  const searchUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?search=${encodedName}`;

  console.log(`[${playerName}] ESPN search: ${searchUrl}`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return { espnId: null, headshotUrl: null, error: `ESPN returned ${response.status}` };
    }

    const data = await response.json();
    const items = data.items ?? [];

    if (items.length === 0) {
      return { espnId: null, headshotUrl: null, error: 'No ESPN player found' };
    }

    // ESPN returns lightweight refs; fetch the first one
    const detailUrl = items[0].$ref;
    const detailResponse = await fetch(detailUrl);
    const detail = await detailResponse.json();

    const espnId = String(detail.id);
    const headshotUrl = detail.headshot?.href ?? null;

    if (!headshotUrl) {
      return { espnId, headshotUrl: null, error: 'No headshot in athlete detail' };
    }

    return { espnId, headshotUrl, error: null };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { espnId: null, headshotUrl: null, error: msg };
  }
}

async function fetchHeadshotImage(headshotUrl: string, playerName: string): Promise<{ bytes: number; error: string | null }> {
  console.log(`[${playerName}] Fetching headshot: ${headshotUrl}`);
  
  try {
    const response = await fetch(headshotUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.espn.com/',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
      console.log(`[${playerName}] Headshot fetch failed with status ${response.status}`);
      return { bytes: 0, error: `Headshot fetch returned ${response.status}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = arrayBuffer.byteLength;
    console.log(`[${playerName}] Headshot fetched: ${bytes} bytes`);
    
    return { bytes, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${playerName}] Headshot fetch error:`, errorMsg);
    return { bytes: 0, error: `Fetch failed: ${errorMsg}` };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== test-espn-headshots invoked ===');

  // Verify admin
  const { authorized, error: authError } = await verifyAdmin(req);
  if (!authorized) {
    console.error('Authorization failed:', authError);
    return new Response(JSON.stringify({ error: authError }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { playerNames } = await req.json();
    
    if (!Array.isArray(playerNames) || playerNames.length === 0) {
      return new Response(JSON.stringify({ error: 'playerNames must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${playerNames.length} players`);
    
    const results: PlayerResult[] = [];
    
    for (const name of playerNames) {
      console.log(`\n--- Processing: ${name} ---`);
      
      const result: PlayerResult = {
        name,
        found: false,
        espnId: null,
        headshotUrl: null,
        imageBytes: 0,
        error: null,
      };
      
      // Step 1: Search ESPN for player
      const { espnId, headshotUrl, error: searchError } = await searchEspnPlayer(name);
      
      if (searchError || !espnId || !headshotUrl) {
        result.error = searchError || 'No ESPN ID or headshot found';
        results.push(result);
        continue;
      }
      
      result.espnId = espnId;
      result.headshotUrl = headshotUrl;
      
      // Step 2: Fetch headshot image to verify size
      const { bytes, error: fetchError } = await fetchHeadshotImage(headshotUrl, name);
      
      if (fetchError) {
        result.error = fetchError;
        results.push(result);
        continue;
      }
      
      result.imageBytes = bytes;
      
      // Success criteria: > 5000 bytes
      if (bytes > 5000) {
        result.found = true;
        console.log(`[${name}] SUCCESS: ${bytes} bytes`);
      } else {
        result.error = `Image too small (${bytes} bytes), likely placeholder or missing`;
        console.log(`[${name}] FAILED: ${bytes} bytes (too small)`);
      }
      
      results.push(result);
      
      // Small delay to be nice to ESPN API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Summary
    const successCount = results.filter(r => r.found).length;
    const failCount = results.filter(r => !r.found).length;
    console.log(`\n=== Summary: ${successCount} found, ${failCount} failed ===`);
    
    return new Response(JSON.stringify({
      success: true,
      totalProcessed: results.length,
      found: successCount,
      failed: failCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error:', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

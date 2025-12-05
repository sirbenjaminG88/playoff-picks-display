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

async function searchEspnPlayer(playerName: string): Promise<{ espnId: string | null; error: string | null }> {
  const encodedName = encodeURIComponent(playerName);
  const searchUrl = `https://site.web.api.espn.com/apis/common/v3/search?query=${encodedName}&limit=10&type=player`;
  
  console.log(`[${playerName}] Searching ESPN: ${searchUrl}`);
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.espn.com/',
        'Origin': 'https://www.espn.com',
      }
    });

    if (!response.ok) {
      console.log(`[${playerName}] ESPN search failed with status ${response.status}`);
      return { espnId: null, error: `ESPN search returned ${response.status}` };
    }

    const data = await response.json();
    console.log(`[${playerName}] ESPN search response:`, JSON.stringify(data).slice(0, 500));

    // Look for NFL player results
    const results = data.results || [];
    for (const category of results) {
      if (category.type === 'player' || category.name === 'Athletes') {
        const items = category.contents || category.items || [];
        for (const item of items) {
          // Check if it's an NFL player
          const sport = item.sport?.slug || item.sport || '';
          const league = item.league?.slug || item.league || '';
          
          console.log(`[${playerName}] Found player: ${item.displayName || item.name}, sport: ${sport}, league: ${league}`);
          
          if (sport === 'football' || league === 'nfl' || item.type === 'player') {
            const espnId = item.id || item.uid?.split(':').pop();
            if (espnId) {
              console.log(`[${playerName}] Found ESPN ID: ${espnId}`);
              return { espnId: String(espnId), error: null };
            }
          }
        }
      }
    }

    // Also check if there's a direct athletes array
    if (data.athletes) {
      for (const athlete of data.athletes) {
        const sport = athlete.sport?.slug || '';
        if (sport === 'football' || !sport) {
          const espnId = athlete.id || athlete.uid?.split(':').pop();
          if (espnId) {
            console.log(`[${playerName}] Found ESPN ID from athletes: ${espnId}`);
            return { espnId: String(espnId), error: null };
          }
        }
      }
    }

    console.log(`[${playerName}] No NFL player found in ESPN search results`);
    return { espnId: null, error: 'No NFL player found in search results' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${playerName}] ESPN search error:`, errorMsg);
    return { espnId: null, error: `Search failed: ${errorMsg}` };
  }
}

async function fetchHeadshotImage(espnId: string, playerName: string): Promise<{ bytes: number; error: string | null }> {
  const headshotUrl = `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
  
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
      const { espnId, error: searchError } = await searchEspnPlayer(name);
      
      if (searchError || !espnId) {
        result.error = searchError || 'No ESPN ID found';
        results.push(result);
        continue;
      }
      
      result.espnId = espnId;
      result.headshotUrl = `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
      
      // Step 2: Fetch headshot image
      const { bytes, error: fetchError } = await fetchHeadshotImage(espnId, name);
      
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

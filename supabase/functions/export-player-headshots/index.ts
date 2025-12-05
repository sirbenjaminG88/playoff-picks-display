import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin verification helper
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { authorized: false, error: 'Invalid or expired token' };
  }

  // Check admin role
  const { data: hasAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !hasAdmin) {
    return { authorized: false, error: 'Admin privileges required' };
  }

  return { authorized: true };
}

// Sanitize filename for ZIP
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const { authorized, error: authError } = await verifyAdmin(req);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let status: string | undefined;
    let hasHeadshot: boolean | undefined;
    let limit = 100;

    try {
      const body = await req.json();
      status = body.status;
      hasHeadshot = body.has_headshot;
      if (body.limit && typeof body.limit === 'number' && body.limit > 0) {
        limit = body.limit; // No cap - allow any limit
      }
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate - must have either status or has_headshot
    const validStatuses = ['ok', 'placeholder', 'no_url'];
    if (!status && hasHeadshot === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Must provide either status or has_headshot filter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query for players
    let query = supabase
      .from('players')
      .select('id, full_name, image_url')
      .eq('season', 2025)
      .eq('group', 'Offense')
      .limit(limit);

    // Apply filters based on provided parameters
    if (status) {
      query = query.eq('headshot_status', status);
    }
    if (hasHeadshot !== undefined) {
      query = query.eq('has_headshot', hasHeadshot);
    }

    // For image export, we need image_url to exist
    query = query.not('image_url', 'is', null);

    // Determine folder name for ZIP
    let folderName = status || (hasHeadshot ? 'has_headshot_true' : 'has_headshot_false');

    const { data: players, error: queryError } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!players || players.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: `No players found with filter '${folderName}'` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${players.length} players with filter '${folderName}'`);

    // Create ZIP file using JSZip
    const zip = new JSZip();

    let successCount = 0;
    let errorCount = 0;

    // Fetch each image and add to ZIP
    for (const player of players) {
      if (!player.image_url) {
        console.log(`Skipping ${player.full_name} - no image_url`);
        continue;
      }

      try {
        const response = await fetch(player.image_url);
        if (!response.ok) {
          console.error(`Failed to fetch image for ${player.full_name}: ${response.status}`);
          errorCount++;
          continue;
        }

        const imageBuffer = await response.arrayBuffer();
        const imageData = new Uint8Array(imageBuffer);
        
        // Determine file extension from URL or content-type
        let extension = 'png';
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
          extension = 'jpg';
        } else if (contentType?.includes('gif')) {
          extension = 'gif';
        } else if (contentType?.includes('webp')) {
          extension = 'webp';
        }

        const sanitizedName = sanitizeFilename(player.full_name);
        const filename = `${folderName}/${player.id}_${sanitizedName}.${extension}`;
        
        zip.addFile(filename, imageData);
        successCount++;
        console.log(`Added ${filename} to ZIP`);
      } catch (err) {
        console.error(`Error processing ${player.full_name}:`, err);
        errorCount++;
      }
    }

    // Generate ZIP as Uint8Array
    const zipData = await zip.generateAsync({ type: "uint8array" });

    console.log(`ZIP created: ${successCount} images, ${errorCount} errors`);

    // Return ZIP file - convert to ArrayBuffer for Response
    return new Response(zipData.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}-headshots-sample.zip"`,
      },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

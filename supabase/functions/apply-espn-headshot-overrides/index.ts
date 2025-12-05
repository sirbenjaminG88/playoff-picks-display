import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for season parameter
    let season = 2025;
    try {
      const body = await req.json();
      if (body.season) {
        season = parseInt(body.season);
      }
    } catch {
      // Default to 2025 if no body or invalid JSON
    }

    console.log(`Applying ESPN headshot overrides for season ${season}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all headshot overrides for the season
    const { data: overrides, error: fetchError } = await supabase
      .from('headshot_overrides')
      .select('id, player_id, api_player_id, override_image_url, source')
      .eq('season', season);

    if (fetchError) {
      throw new Error(`Failed to fetch overrides: ${fetchError.message}`);
    }

    if (!overrides || overrides.length === 0) {
      console.log('No headshot overrides found for season', season);
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: 'No overrides found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${overrides.length} headshot overrides to apply`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Apply each override
    for (const override of overrides) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          image_url: override.override_image_url,
          has_headshot: true,
          headshot_status: 'override'
        })
        .eq('id', override.player_id);

      if (updateError) {
        const msg = `Failed to update player ${override.player_id}: ${updateError.message}`;
        console.error(msg);
        errors.push(msg);
      } else {
        updatedCount++;
        console.log(`Updated player ${override.player_id} with ESPN headshot`);
      }
    }

    const summary = {
      success: true,
      season,
      totalOverrides: overrides.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    };

    console.log('ESPN headshot overrides applied:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in apply-espn-headshot-overrides:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

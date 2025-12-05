import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const imageUrl = 'https://media.api-sports.io/american-football/players/14251.png';
    
    console.log(`Fetching image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    console.log(`Image size: ${buffer.byteLength} bytes`);
    
    // Compute SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    
    // Convert to lowercase hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('PLACEHOLDER_HEADSHOT_SHA256 =', hexHash);
    
    return new Response(
      JSON.stringify({ hash: hexHash, imageUrl, sizeBytes: buffer.byteLength }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error computing hash:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

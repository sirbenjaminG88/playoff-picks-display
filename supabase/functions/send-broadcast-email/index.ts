import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // PERMANENTLY DISABLED - Do not send any emails
  console.log(`=== send-broadcast-email BLOCKED - function is permanently disabled ===`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ 
      error: "Broadcast emails are permanently disabled",
      blocked: true 
    }),
    { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
};

serve(handler);

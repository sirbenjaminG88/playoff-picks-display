import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BETA_USERS = [
  { email: "roberthirsch2008@gmail.com", first_name: "Robert" },
  { email: "traderjoeffl@gmail.com", first_name: "Joe" },
  { email: "tnhirsch@gmail.com", first_name: "TN" },
  { email: "hirschbrett@gmail.com", first_name: "Brett" },
  { email: "bhirsch@eysautomation.com", first_name: "B" },
  { email: "lil.hirsch22@gmail.com", first_name: "Lil" },
  { email: "tylerhirsch8@gmail.com", first_name: "Tyler" },
  { email: "mgmhirsch@gmail.com", first_name: "MGM" },
  { email: "jcrowley1122@gmail.com", first_name: "J" },
  { email: "bmhirsch@comcast.net", first_name: "BM" },
  { email: "ryan.t.hirsch@gmail.com", first_name: "Ryan" },
  { email: "julieannhirsch@gmail.com", first_name: "Julie" },
  { email: "roberthirsch2013@gmail.com", first_name: "Robert" },
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    console.log("Creating Emma Beta Users audience...");
    
    // Step 1: Create the audience
    const audienceRes = await fetch("https://api.resend.com/audiences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Emma Beta Users" }),
    });
    
    const audienceData = await audienceRes.json();
    console.log("Audience response:", audienceData);
    
    if (!audienceRes.ok) {
      throw new Error("Failed to create audience: " + JSON.stringify(audienceData));
    }
    
    const audienceId = audienceData.id;
    console.log("Audience ID:", audienceId);
    
    // Step 2: Add each contact to the audience
    const results = [];
    for (const user of BETA_USERS) {
      console.log(`Adding contact: ${user.email}`);
      
      const contactRes = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          first_name: user.first_name,
          unsubscribed: false,
        }),
      });
      
      const contactData = await contactRes.json();
      
      results.push({
        email: user.email,
        success: contactRes.ok,
        id: contactData.id,
        error: contactRes.ok ? null : contactData,
      });
      
      console.log(`Contact result for ${user.email}:`, contactData);
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({
        success: true,
        audienceId,
        audienceName: "Emma Beta Users",
        contactsAdded: successCount,
        totalContacts: BETA_USERS.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating contacts:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

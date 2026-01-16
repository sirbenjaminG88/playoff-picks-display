import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastEmailRequest {
  to: string[];
  subject: string;
  heading: string;
  body: string[];
  signature?: string;
  ctaText?: string;
  ctaUrl?: string;
}

const generateEmailHtml = ({ heading, body, signature, ctaText, ctaUrl }: Omit<BroadcastEmailRequest, 'to' | 'subject'>) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #0E0F11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0;">
  <div style="margin: 0 auto; padding: 40px 20px; max-width: 480px;">
    
    <!-- Logo Section -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background-color: #22C55E; border-radius: 16px; padding: 16px; margin-bottom: 16px;">
        <span style="font-size: 32px;">🏆</span>
      </div>
      <h1 style="color: #22C55E; font-size: 32px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: -0.5px;">EMMA</h1>
      <p style="color: #AEB3BA; font-size: 14px; margin: 0;">Fantasy Playoff League</p>
    </div>

    <!-- Main Content Card -->
    <div style="background-color: #1A1C1F; border-radius: 12px; border: 1px solid #2A2D31; padding: 32px;">
      <h2 style="color: #FFFFFF; font-size: 24px; font-weight: 600; margin: 0 0 24px 0; text-align: center;">
        ${heading}
      </h2>
      
      ${body.map(paragraph => `
      <p style="color: #AEB3BA; font-size: 15px; line-height: 24px; margin: 0 0 20px 0;">
        ${paragraph}
      </p>
      `).join('')}
      
      ${signature ? `
      <p style="color: #FFFFFF; font-size: 15px; margin: 20px 0 0 0;">
        ${signature}
      </p>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; text-align: center;">
      ${ctaText && ctaUrl ? `
      <a href="${ctaUrl}" style="display: inline-block; background-color: #22C55E; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
        ${ctaText}
      </a>
      ` : ''}
      <p style="color: #7C8289; font-size: 12px; margin: 16px 0 0 0;">
        © 2025 EMMA Fantasy League
      </p>
    </div>

  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, heading, body, signature, ctaText, ctaUrl }: BroadcastEmailRequest = await req.json();

    if (!to || !to.length || !subject || !heading || !body || !body.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, heading, body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const html = generateEmailHtml({ heading, body, signature, ctaText, ctaUrl });

    const emailResponse = await resend.emails.send({
      from: "Ben <ben@playoffpicks.app>",
      to,
      subject,
      html,
    });

    console.log("Broadcast email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-broadcast-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

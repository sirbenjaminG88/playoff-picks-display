import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPickSubmissionRequest {
  leagueId: string;
  submittingUserId: string;
  submittingUserName: string;
  week: number;
  seasonType: string;
}

interface PushToken {
  token: string;
  user_id: string;
}

async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  // Create JWT header and payload
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  // Base64url encode
  const encoder = new TextEncoder();
  const base64url = (data: Uint8Array) => {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function sendFCMPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken();
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const serviceAccount = JSON.parse(serviceAccountJson!);
    const projectId = serviceAccount.project_id;

    const message = {
      message: {
        token,
        notification: { title, body },
        data: data || {},
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: "default",
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FCM error for token ${token.substring(0, 20)}...: ${errorText}`);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error sending FCM push: ${error}`);
    return { success: false, error: String(error) };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leagueId, submittingUserId, submittingUserName, week, seasonType }: NotifyPickSubmissionRequest = await req.json();

    console.log(`=== notify-pick-submission invoked ===`);
    console.log(`League: ${leagueId}, Submitter: ${submittingUserName} (${submittingUserId}), Week: ${week}, Season: ${seasonType}`);

    if (!leagueId || !submittingUserId || !submittingUserName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all league members except the submitter, joined with their push tokens
    const { data: membersWithTokens, error: membersError } = await supabase
      .from("league_members")
      .select(`
        user_id,
        push_tokens!inner(token, user_id)
      `)
      .eq("league_id", leagueId)
      .neq("user_id", submittingUserId);

    if (membersError) {
      console.error("Error fetching league members:", membersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch league members" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!membersWithTokens || membersWithTokens.length === 0) {
      console.log("No other league members with push tokens found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No recipients found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract unique tokens
    const tokens: PushToken[] = [];
    for (const member of membersWithTokens) {
      const pushTokens = member.push_tokens as unknown as PushToken[];
      if (Array.isArray(pushTokens)) {
        for (const pt of pushTokens) {
          tokens.push({ token: pt.token, user_id: member.user_id });
        }
      }
    }

    console.log(`Found ${tokens.length} push tokens to notify`);

    // Send notifications
    const title = "Emma";
    const body = `${submittingUserName} just locked in their picks`;
    const data = {
      type: "pick_submission",
      leagueId,
      week: String(week),
      seasonType,
    };

    let successCount = 0;
    let failCount = 0;

    for (const { token } of tokens) {
      const result = await sendFCMPush(token, title, body, data);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`Notifications sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: tokens.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in notify-pick-submission:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

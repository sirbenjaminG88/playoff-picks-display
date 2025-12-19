import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
}

// Send push notification via APNs (Apple Push Notification service)
async function sendAPNsPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const authKey = Deno.env.get('APNS_AUTH_KEY');
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') || 'app.lovable.2eefee5788904711a2bb541c24b6a97b';
  
  if (!keyId || !teamId || !authKey) {
    console.error('Missing APNs credentials');
    return { success: false, error: 'Missing APNs credentials' };
  }

  try {
    // Create JWT for APNs authentication
    const header = { alg: 'ES256', kid: keyId };
    const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };
    
    // Import the private key
    const pemKey = authKey.replace(/\\n/g, '\n');
    const pemContents = pemKey.replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Create JWT
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);
    
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signatureInput
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

    // Send to APNs
    const apnsUrl = `https://api.push.apple.com/3/device/${token}`;
    
    const apnsPayload = {
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
      },
      ...data,
    };

    const response = await fetch(apnsUrl, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(apnsPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`APNs error for token ${token.substring(0, 10)}...: ${response.status} - ${errorText}`);
      return { success: false, error: `APNs error: ${response.status}` };
    }

    console.log(`Successfully sent push to token ${token.substring(0, 10)}...`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error sending APNs push: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { 
      title = "Pick Deadline Reminder",
      message = "Don't forget to make your picks before the games start!",
      userIds, // Optional: specific user IDs to notify
      data = {} // Optional: additional data to include
    } = body;

    console.log(`Sending pick deadline notifications. Title: "${title}"`);

    // Get push tokens
    let query = supabase
      .from('push_tokens')
      .select('*');
    
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} push tokens`);

    // Send notifications
    const results = await Promise.all(
      tokens.map(async (token: PushToken) => {
        if (token.platform === 'ios') {
          return sendAPNsPush(token.token, title, message, data);
        }
        // Android support can be added here with FCM
        return { success: false, error: 'Unsupported platform' };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Notifications sent. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total: tokens.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-pick-deadline-notifications:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

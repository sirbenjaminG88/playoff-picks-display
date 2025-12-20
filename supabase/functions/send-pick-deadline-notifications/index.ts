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

// Get OAuth 2.0 access token from Firebase service account
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  // Create JWT for Google OAuth
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Import the private key
  const pemKey = serviceAccount.private_key;
  
  console.log('Raw key first 100 chars:', pemKey.substring(0, 100));
  console.log('Raw key last 100 chars:', pemKey.substring(pemKey.length - 100));
  console.log('Contains BEGIN:', pemKey.includes('BEGIN'));
  console.log('Contains END:', pemKey.includes('END'));
  console.log('Contains escaped newlines:', pemKey.includes('\\n'));
  
  // Handle escaped newlines from JSON
  const keyWithNewlines = pemKey.replace(/\\n/g, '\n');
  
  console.log('After newline fix, first 100:', keyWithNewlines.substring(0, 100));
  
  // Match everything between BEGIN and END markers (handle extra spaces in malformed keys)
  const match = keyWithNewlines.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END\s+PRIVATE\s+KEY-----/);
  
  if (!match) {
    console.error('Could not find PEM key markers in private key');
    throw new Error('Invalid private key format');
  }
  
  // Clean the base64 content - remove all whitespace
  const base64Clean = match[1].replace(/[\s]/g, '');

  console.log('Cleaned key length:', base64Clean.length);
  console.log('First 20 chars:', base64Clean.substring(0, 20));
  console.log('Last 20 chars:', base64Clean.substring(base64Clean.length - 20));

  let binaryKey: Uint8Array;
  try {
    const decoded = atob(base64Clean);
    binaryKey = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      binaryKey[i] = decoded.charCodeAt(i);
    }
  } catch (e) {
    console.error('Failed to decode base64 private key. Key length:', base64Clean.length);
    console.error('atob error:', e);
    throw new Error('Failed to decode base64');
  }

  const keyBuffer = binaryKey.buffer.slice(binaryKey.byteOffset, binaryKey.byteOffset + binaryKey.byteLength) as ArrayBuffer;
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Create JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    signatureInput
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

// Send push notification via Firebase Cloud Messaging
async function sendFCMPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    // Get OAuth access token
    const accessToken = await getAccessToken();

    // FCM v1 API endpoint
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Build notification payload
    const message: any = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Add custom data if provided
    if (data) {
      message.data = data;
    }

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FCM error for token ${token.substring(0, 10)}...: ${response.status} - ${errorText}`);
      return { success: false, error: `FCM error: ${response.status}` };
    }

    console.log(`Successfully sent push to token ${token.substring(0, 10)}...`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error sending FCM push: ${errorMessage}`);
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

    // Send notifications via FCM
    const results = await Promise.all(
      tokens.map(async (token: PushToken) => {
        return sendFCMPush(token.token, title, message, data);
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

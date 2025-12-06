import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditResult {
  player_id: string;
  full_name: string;
  team_abbr: string | null;
  jersey_number: string | null;
  image_url: string | null;
  image_accessible: boolean;
  ai_analysis: {
    detected_jersey?: string;
    detected_team_colors?: string;
    confidence?: string;
    name_visible?: boolean;
    issues?: string[];
  } | null;
  verification_status: 'verified' | 'mismatch' | 'error' | 'no_image';
  mismatch_reasons: string[];
}

async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: hasRole, error } = await supabase.rpc('has_role', { 
    _user_id: (await supabase.auth.getUser()).data.user?.id,
    _role: 'admin' 
  });

  if (error || !hasRole) {
    return { authorized: false, error: 'Admin role required' };
  }

  return { authorized: true };
}

async function checkImageAccessible(url: string): Promise<{ accessible: boolean; size?: number }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return { accessible: false };
    }
    const contentLength = response.headers.get('content-length');
    return { 
      accessible: true, 
      size: contentLength ? parseInt(contentLength) : undefined 
    };
  } catch {
    return { accessible: false };
  }
}

async function analyzeImageWithAI(imageUrl: string, playerName: string, teamAbbr: string | null, jerseyNumber: string | null): Promise<AuditResult['ai_analysis']> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    return { issues: ['LOVABLE_API_KEY not configured'] };
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are verifying an NFL player headshot. The database says this image is of:
- Player: ${playerName}
- Team: ${teamAbbr || 'Unknown'}
- Jersey Number: #${jerseyNumber || 'Unknown'}

YOUR TASK: Determine if this image is ACTUALLY ${playerName} by considering ALL evidence holistically.

VERIFICATION APPROACH (in order of reliability):
1. JERSEY NUMBER - Most reliable! If visible and matches #${jerseyNumber || 'unknown'}, that's very strong evidence
2. TEAM COLORS - ${teamAbbr || 'The team'}'s uniform colors should match
3. FACIAL FEATURES - Does this look like ${playerName}? Consider hair, facial hair, skin tone
4. CONTEXT CLUES - Any visible logos, text, or other identifying info

CRITICAL RULE: Do NOT flag a mismatch based solely on facial uncertainty. If the jersey shows #${jerseyNumber || 'X'} and colors match ${teamAbbr || 'the team'}, the image is almost certainly correct.

Respond in this exact JSON format:
{
  "is_real_photo": true/false,
  "jersey_number_visible": true/false,
  "detected_jersey": "number or null",
  "jersey_matches": true/false/null,
  "team_colors_visible": true/false,
  "detected_team_colors": "describe colors you see",
  "colors_match_team": true/false/null,
  "name_visible": true/false,
  "detected_name": "name if visible, otherwise null",
  "face_confidence": "high/medium/low/uncertain",
  "face_notes": "brief facial observation",
  "overall_verdict": "CORRECT" | "LIKELY_CORRECT" | "UNCERTAIN" | "LIKELY_WRONG" | "WRONG",
  "verdict_reasoning": "Explain your conclusion based on ALL factors combined",
  "confidence": "high/medium/low"
}

VERDICT GUIDELINES:
- CORRECT: Jersey + colors match, face is consistent or uncertain
- LIKELY_CORRECT: 2+ factors match (e.g., jersey matches + right colors)  
- UNCERTAIN: Mixed signals or not enough visible evidence
- LIKELY_WRONG: Multiple clear mismatches
- WRONG: Clear evidence this is definitely a different player (wrong jersey number, recognized as someone specific, etc.)

Only return the JSON.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return { issues: [`AI API error: ${response.status}`] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return { issues: ['No AI response content'] };
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { issues: ['Could not parse AI response'] };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const issues: string[] = [];
      
      // Check if it's a real photo
      if (parsed.is_real_photo === false) {
        issues.push('Not a real player photo');
      }
      
      // Only flag based on overall verdict, not individual factors
      const verdict = parsed.overall_verdict?.toUpperCase();
      
      if (verdict === 'WRONG') {
        issues.push(`WRONG IMAGE: ${parsed.verdict_reasoning || 'AI determined this is the wrong player'}`);
      } else if (verdict === 'LIKELY_WRONG') {
        issues.push(`LIKELY WRONG: ${parsed.verdict_reasoning || 'Multiple mismatches detected'}`);
      } else if (verdict === 'UNCERTAIN') {
        // Only add as a note, not a major issue
        if (parsed.verdict_reasoning) {
          issues.push(`Uncertain: ${parsed.verdict_reasoning}`);
        }
      }
      // CORRECT and LIKELY_CORRECT don't generate issues
      
      return {
        detected_jersey: parsed.detected_jersey,
        detected_team_colors: parsed.detected_team_colors,
        confidence: parsed.confidence,
        name_visible: parsed.name_visible,
        issues: issues.filter(Boolean)
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      return { issues: ['Failed to parse AI response JSON'] };
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    return { issues: [`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authResult = await verifyAdmin(req);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let limit = 10;
    let offset = 0;
    let onlyEspn = true;
    
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(parseInt(body.limit), 50); // Max 50 per request
      if (body.offset) offset = parseInt(body.offset);
      if (body.onlyEspn !== undefined) onlyEspn = body.onlyEspn;
    } catch {
      // Use defaults
    }

    console.log(`Starting player image audit: limit=${limit}, offset=${offset}, onlyEspn=${onlyEspn}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch players to audit - only those with points_for_headshot (relevant players)
    let query = supabase
      .from('players')
      .select('id, full_name, team_abbr, jersey_number, image_url, has_headshot, headshot_status, points_for_headshot')
      .eq('season', 2025)
      .not('image_url', 'is', null)
      .not('points_for_headshot', 'is', null)
      .order('points_for_headshot', { ascending: false }) // Highest scorers first
      .range(offset, offset + limit - 1);

    if (onlyEspn) {
      query = query.ilike('image_url', '%espncdn%');
    }

    const { data: players, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch players: ${fetchError.message}`);
    }

    if (!players || players.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No players to audit',
          results: [],
          summary: { total: 0, verified: 0, mismatches: 0, errors: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auditing ${players.length} players...`);

    const results: AuditResult[] = [];
    
    for (const player of players) {
      console.log(`Auditing: ${player.full_name}`);
      
      const result: AuditResult = {
        player_id: player.id,
        full_name: player.full_name,
        team_abbr: player.team_abbr,
        jersey_number: player.jersey_number,
        image_url: player.image_url,
        image_accessible: false,
        ai_analysis: null,
        verification_status: 'no_image',
        mismatch_reasons: []
      };

      if (!player.image_url) {
        results.push(result);
        continue;
      }

      // Check if image is accessible
      const accessCheck = await checkImageAccessible(player.image_url);
      result.image_accessible = accessCheck.accessible;

      if (!accessCheck.accessible) {
        result.verification_status = 'error';
        result.mismatch_reasons.push('Image URL not accessible');
        results.push(result);
        continue;
      }

      // Check for suspiciously small images (likely placeholders)
      if (accessCheck.size && accessCheck.size < 5000) {
        result.mismatch_reasons.push(`Suspiciously small image (${accessCheck.size} bytes)`);
      }

      // Analyze with AI
      const aiAnalysis = await analyzeImageWithAI(
        player.image_url,
        player.full_name,
        player.team_abbr,
        player.jersey_number
      );
      result.ai_analysis = aiAnalysis;

      // Determine verification status
      if (aiAnalysis?.issues && aiAnalysis.issues.length > 0) {
        result.mismatch_reasons.push(...aiAnalysis.issues);
      }

      if (result.mismatch_reasons.length > 0) {
        result.verification_status = 'mismatch';
      } else {
        result.verification_status = 'verified';
      }

      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate summary
    const summary = {
      total: results.length,
      verified: results.filter(r => r.verification_status === 'verified').length,
      mismatches: results.filter(r => r.verification_status === 'mismatch').length,
      errors: results.filter(r => r.verification_status === 'error').length,
      no_image: results.filter(r => r.verification_status === 'no_image').length
    };

    // Get flagged players (mismatches only)
    const flagged = results.filter(r => r.verification_status === 'mismatch' || r.verification_status === 'error');

    console.log('Audit complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        flagged,
        all_results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in audit-player-images:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

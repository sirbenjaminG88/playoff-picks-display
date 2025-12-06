import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedPlayer {
  name: string;
  points: number;
}

interface MatchResult {
  matched: number;
  updated: string[];
  unmatched: string[];
  errors: string[];
}

// Normalize player name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,'"]/g, "")
    .replace(/\bjr\b\.?/gi, "")
    .replace(/\bsr\b\.?/gi, "")
    .replace(/\bii\b/gi, "")
    .replace(/\biii\b/gi, "")
    .replace(/\biv\b/gi, "")
    .trim();
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Find best matching player from database
function findBestMatch(
  extractedName: string,
  dbPlayers: { full_name: string; api_player_id: string }[]
): { player: { full_name: string; api_player_id: string } | null; confidence: number } {
  const normalizedExtracted = normalizeName(extractedName);
  
  let bestMatch: { full_name: string; api_player_id: string } | null = null;
  let bestScore = Infinity;
  
  for (const player of dbPlayers) {
    const normalizedDb = normalizeName(player.full_name);
    
    // Exact match after normalization
    if (normalizedDb === normalizedExtracted) {
      return { player, confidence: 1 };
    }
    
    // Calculate distance
    const distance = levenshteinDistance(normalizedDb, normalizedExtracted);
    const maxLen = Math.max(normalizedDb.length, normalizedExtracted.length);
    const similarity = 1 - distance / maxLen;
    
    if (distance < bestScore && similarity > 0.75) {
      bestScore = distance;
      bestMatch = player;
    }
  }
  
  return { 
    player: bestMatch, 
    confidence: bestMatch ? 1 - bestScore / Math.max(normalizeName(bestMatch.full_name).length, normalizedExtracted.length) : 0 
  };
}

// Convert ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// Use Lovable AI (Gemini) to extract player data from image
async function extractPlayersFromImage(base64Image: string, fileName: string): Promise<ExtractedPlayer[]> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `You are analyzing a screenshot of an NFL Fantasy "Scoring Leaders" page.

Extract ALL player rows visible in this image. For each player, extract:
1. The player's full name (e.g., "Christian McCaffrey", "Josh Allen")
2. Their fantasy points total (the number in the Points/Fantasy Points column)

Return ONLY a JSON array with objects containing "name" and "points" fields.
Do not include any markdown formatting, code blocks, or explanation.
Just return the raw JSON array.

Example output:
[{"name":"Christian McCaffrey","points":234.5},{"name":"Josh Allen","points":198.2}]

If you cannot read a name or points clearly, skip that row.
Extract every visible player row from the image.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  console.log(`[${fileName}] AI response: ${content.substring(0, 200)}...`);

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const players = JSON.parse(jsonStr);
    if (Array.isArray(players)) {
      return players.filter(
        (p: any) => typeof p.name === "string" && typeof p.points === "number" && p.points >= 10
      );
    }
    return [];
  } catch (e) {
    console.error(`[${fileName}] Failed to parse AI response as JSON:`, e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for storage and database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // List all files in point-screenshots bucket
    const { data: files, error: listError } = await adminClient.storage
      .from("point-screenshots")
      .list("", { limit: 100, sortBy: { column: "name", order: "asc" } });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    const pngFiles = files?.filter((f) => f.name.endsWith(".png")) || [];
    console.log(`Found ${pngFiles.length} PNG files in point-screenshots bucket`);

    if (pngFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No PNG files found in point-screenshots bucket",
          summary: { filesProcessed: 0, playersUpdated: 0, unmatchedPlayers: [] },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all players from database for matching
    const { data: dbPlayers, error: playersError } = await adminClient
      .from("players")
      .select("api_player_id, full_name")
      .eq("season", 2025);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`Loaded ${dbPlayers?.length || 0} players from database for matching`);

    // Collect all extracted players (deduped by name, keeping highest points)
    const allExtractedPlayers: Map<string, ExtractedPlayer> = new Map();
    const parseResults: { fileName: string; playerCount: number; error?: string }[] = [];

    // Process each screenshot
    for (const file of pngFiles) {
      console.log(`Processing: ${file.name}`);
      
      try {
        // Download the file
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from("point-screenshots")
          .download(file.name);

        if (downloadError || !fileData) {
          parseResults.push({ fileName: file.name, playerCount: 0, error: `Download failed: ${downloadError?.message}` });
          continue;
        }

        // Convert blob to base64 using chunked approach to avoid stack overflow
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        // Extract players using AI vision
        const players = await extractPlayersFromImage(base64, file.name);
        
        parseResults.push({ fileName: file.name, playerCount: players.length });
        console.log(`[${file.name}] Extracted ${players.length} players`);

        // Dedupe by name, keeping highest points value
        for (const player of players) {
          const normalizedKey = normalizeName(player.name);
          const existing = allExtractedPlayers.get(normalizedKey);
          if (!existing || player.points > existing.points) {
            allExtractedPlayers.set(normalizedKey, player);
          }
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[${file.name}] Error:`, errorMsg);
        parseResults.push({ fileName: file.name, playerCount: 0, error: errorMsg });
      }
    }

    console.log(`Total unique players extracted: ${allExtractedPlayers.size}`);

    // Match and update players
    const matchResult: MatchResult = { matched: 0, updated: [], unmatched: [], errors: [] };

    for (const [key, extracted] of allExtractedPlayers) {
      const { player: match, confidence } = findBestMatch(extracted.name, dbPlayers || []);
      
      if (match && confidence >= 0.75) {
        const { error: updateError } = await adminClient
          .from("players")
          .update({ points_for_headshot: extracted.points })
          .eq("api_player_id", match.api_player_id)
          .eq("season", 2025);

        if (updateError) {
          matchResult.errors.push(`Failed to update ${match.full_name}: ${updateError.message}`);
        } else {
          matchResult.matched++;
          matchResult.updated.push(`${match.full_name}: ${extracted.points} pts`);
        }
      } else {
        matchResult.unmatched.push(`${extracted.name} (${extracted.points} pts)`);
      }
    }

    const response = {
      success: true,
      summary: {
        filesProcessed: pngFiles.length,
        filesWithErrors: parseResults.filter((r) => r.error).length,
        totalPlayersExtracted: allExtractedPlayers.size,
        playersUpdated: matchResult.matched,
        unmatchedCount: matchResult.unmatched.length,
      },
      details: {
        parseResults,
        updatedPlayers: matchResult.updated.slice(0, 20), // First 20 for brevity
        unmatchedPlayers: matchResult.unmatched,
        updateErrors: matchResult.errors,
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to verify admin role
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use service role client for admin verification
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate token using getUser with the JWT
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    console.error('Token validation failed:', userError);
    return { authorized: false, error: 'Invalid user token' };
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });

  if (roleError || !isAdmin) {
    console.log(`User ${user.id} is not an admin`);
    return { authorized: false, error: 'User is not an admin' };
  }

  console.log(`Admin verified: ${user.id}`);
  return { authorized: true, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const { authorized, error: authError } = await verifyAdmin(req);
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiSportsKey = Deno.env.get('API_SPORTS_KEY');
    if (!apiSportsKey) {
      throw new Error('API_SPORTS_KEY not configured');
    }

    const season = 2025;

    console.log(`Fetching playoff teams for season ${season}...`);

    // Step 1: Get all playoff teams for 2024
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: playoffTeams, error: teamsError } = await supabase
      .from('playoff_teams')
      .select('team_id, name')
      .eq('season', season)
      .eq('made_playoffs', true);

    if (teamsError) {
      console.error('Error fetching playoff teams:', teamsError);
      throw teamsError;
    }

    if (!playoffTeams || playoffTeams.length === 0) {
      throw new Error('No playoff teams found for season 2024');
    }

    console.log(`Found ${playoffTeams.length} playoff teams`);

    // Step 2: Fetch players for each team
    const allPlayers: any[] = [];
    const validPositions = ['QB', 'RB', 'WR', 'TE'];
    let withImages = 0;

    for (const team of playoffTeams) {
      console.log(`Fetching players for ${team.name} (team_id: ${team.team_id})...`);

      try {
        const response = await fetch(
          `https://v1.american-football.api-sports.io/players?team=${team.team_id}&season=${season}`,
          {
            headers: {
              'x-apisports-key': apiSportsKey,
            },
          }
        );

        console.log(`API Response Status for team ${team.team_id}: ${response.status}`);

        if (!response.ok) {
          console.error(`API request failed for team ${team.team_id}: ${response.statusText}`);
          const errorText = await response.text();
          console.error(`Error response body: ${errorText}`);
          continue;
        }

        const data = await response.json();
        const players = data.response || [];

        console.log(`Received ${players.length} total players for ${team.name}`);

        // Filter for QB, RB, WR, TE positions - store raw image URL without filtering
        for (const player of players) {
          if (!validPositions.includes(player.position)) continue;
          
          // Store the raw image URL from API without any filtering
          const imageUrl = player.image ?? null;
          const hasHeadshot = !!imageUrl;
          
          if (imageUrl) {
            withImages++;
          }
          
          allPlayers.push({
            player_id: player.id,
            name: player.name,
            position: player.position,
            group: player.group,
            number: player.number,
            team_id: team.team_id,
            team_name: team.name,
            season: season,
            image_url: imageUrl,
            has_headshot: hasHeadshot,
          });
        }

        console.log(`Filtered to ${allPlayers.filter(p => p.team_id === team.team_id).length} QB/RB/WR/TE players for ${team.name}`);
      } catch (error) {
        console.error(`Error fetching players for team ${team.team_id}:`, error);
        // Continue with other teams
      }
    }

    console.log(`Total players to sync: ${allPlayers.length}`);
    console.log(`Players with images: ${withImages}`);

    if (allPlayers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          playersSynced: 0,
          teamsProcessed: playoffTeams.length,
          playersWithImages: withImages,
          message: 'No players found to sync',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 3: Upsert players into database
    // Process in batches to avoid duplicate key issues within same upsert
    const uniquePlayers = new Map<string, any>();
    for (const player of allPlayers) {
      const key = `${player.team_id}-${player.season}-${player.player_id}`;
      uniquePlayers.set(key, player);
    }
    const dedupedPlayers = Array.from(uniquePlayers.values());

    console.log(`Deduped to ${dedupedPlayers.length} unique players`);

    // Step 3a: Fetch existing players to preserve ESPN headshots
    const playerIds = dedupedPlayers.map(p => p.player_id);
    const { data: existingPlayers, error: existingError } = await supabase
      .from('playoff_players')
      .select('player_id, image_url')
      .eq('season', season)
      .in('player_id', playerIds);

    if (existingError) {
      console.error('Error fetching existing players:', existingError);
    }

    // Build a map of existing ESPN headshots to preserve
    const existingEspnMap = new Map<number, string>();
    for (const ep of existingPlayers || []) {
      if (ep.image_url && ep.image_url.includes('espncdn.com')) {
        existingEspnMap.set(ep.player_id, ep.image_url);
      }
    }
    console.log(`Found ${existingEspnMap.size} existing ESPN headshots to preserve`);

    // Step 3b: For each player, preserve ESPN headshot if it exists
    const playersToUpsert = dedupedPlayers.map(player => {
      const existingEspn = existingEspnMap.get(player.player_id);
      if (existingEspn) {
        // Preserve the ESPN headshot
        return { ...player, image_url: existingEspn, has_headshot: true };
      }
      return player;
    });

    const { data: insertedPlayers, error: insertError } = await supabase
      .from('playoff_players')
      .upsert(playersToUpsert, {
        onConflict: 'team_id,season,player_id',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    const syncedCount = insertedPlayers?.length || dedupedPlayers.length;
    console.log(`Successfully synced ${syncedCount} playoff players`);

    // Step 4: Sync ESPN depth charts to mark starters + store depth chart metadata
    console.log('Starting ESPN depth chart sync...');

    // ESPN team ID mapping for 2025 playoff teams
    // API-Sports team_id → ESPN team_id
    const espnTeamIdMap: Record<number, number> = {
      // 2025 AFC Playoff Teams
      28: 5,   // Broncos → ESPN 5
      3: 17,   // Patriots → ESPN 17
      2: 30,   // Jaguars → ESPN 30
      22: 23,  // Steelers → ESPN 23
      26: 34,  // Texans → ESPN 34
      20: 2,   // Bills → ESPN 2
      30: 24,  // Chargers → ESPN 24
      // 2025 NFC Playoff Teams
      23: 26,  // Seahawks → ESPN 26
      16: 3,   // Bears → ESPN 3
      12: 21,  // Eagles → ESPN 21
      19: 29,  // Panthers → ESPN 29
      31: 14,  // Rams → ESPN 14
      14: 25,  // 49ers → ESPN 25
      15: 9,   // Packers → ESPN 9
    };

    // Normalize name for matching - removes suffixes and handles case insensitivity
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        // Remove common suffixes (Jr, Jr., III, II, IV, Sr, Sr.)
        .replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v)$/i, '')
        // Remove any remaining punctuation
        .replace(/[^a-z\s]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Extract last name for fuzzy matching
    const getLastName = (name: string): string => {
      const parts = normalizeName(name).split(' ');
      return parts[parts.length - 1];
    };

    // Common nickname mappings
    const nicknameMap: Record<string, string[]> = {
      'joseph': ['joe'],
      'joe': ['joseph'],
      'william': ['will', 'billy', 'bill'],
      'will': ['william'],
      'robert': ['rob', 'bob', 'bobby'],
      'rob': ['robert'],
      'michael': ['mike'],
      'mike': ['michael'],
      'christopher': ['chris'],
      'chris': ['christopher'],
      'joshua': ['josh'],
      'josh': ['joshua'],
      'daniel': ['dan', 'danny'],
      'dan': ['daniel'],
      'matthew': ['matt'],
      'matt': ['matthew'],
      'anthony': ['tony'],
      'tony': ['anthony'],
      'nicholas': ['nick'],
      'nick': ['nicholas'],
      'kenneth': ['ken', 'kenny'],
      'ken': ['kenneth', 'kenny'],
      'kenny': ['kenneth', 'ken'],
      'james': ['jim', 'jimmy'],
      'jim': ['james'],
      'timothy': ['tim'],
      'tim': ['timothy'],
      'edward': ['ed', 'eddie'],
      'ed': ['edward'],
      'richard': ['rich', 'rick', 'ricky', 'dick'],
      'rick': ['richard'],
      'david': ['dave'],
      'dave': ['david'],
      'benjamin': ['ben'],
      'ben': ['benjamin'],
      'samuel': ['sam'],
      'sam': ['samuel'],
      'stephen': ['steve'],
      'steve': ['stephen', 'steven'],
      'steven': ['steve'],
      'jonathan': ['jon'],
      'jon': ['jonathan'],
      'cj': ['c j'],
      'dj': ['d j'],
      'aj': ['a j'],
      'jj': ['j j'],
      'tj': ['t j'],
    };

    // Quick lookups
    const playersById = new Map<number, any>();
    for (const p of playersToUpsert) playersById.set(p.player_id, p);

    // Build multiple lookup maps for flexible matching
    const nameToPlayerIdMap = new Map<string, number>();
    const lastNameToPlayersMap = new Map<string, Array<{player_id: number, fullName: string, position: string}>>();
    
    for (const player of dedupedPlayers) {
      const normalizedName = normalizeName(player.name);
      const lastName = getLastName(player.name);
      
      // Primary: exact normalized match
      nameToPlayerIdMap.set(`${player.team_id}-${normalizedName}`, player.player_id);
      
      // Also create entries with nickname variants
      const nameParts = normalizedName.split(' ');
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const restOfName = nameParts.slice(1).join(' ');
        const variants = nicknameMap[firstName] || [];
        for (const variant of variants) {
          nameToPlayerIdMap.set(`${player.team_id}-${variant} ${restOfName}`, player.player_id);
        }
      }
      
      // Secondary: last name lookup for position-based matching
      const lastNameKey = `${player.team_id}-${lastName}`;
      if (!lastNameToPlayersMap.has(lastNameKey)) {
        lastNameToPlayersMap.set(lastNameKey, []);
      }
      lastNameToPlayersMap.get(lastNameKey)!.push({
        player_id: player.player_id,
        fullName: player.name,
        position: player.position,
      });
    }

    // Track unmatched ESPN players for logging
    const unmatchedEspnPlayers: Array<{team: string, slot: string, espnName: string, normalizedName: string, possibleMatches?: string}> = [];

    // ESPN depthchart response (current observed):
    // - data.depthchart: array of charts
    // - chart.name includes "3WR" for offense
    // - chart.positions: object keyed by slot (qb, rb, wr1, wr2, wr3, te)
    // - positions[slot].athletes[0] starter, [1] backup
    const extractCharts = (depthData: any): any[] => {
      if (Array.isArray(depthData?.depthchart)) return depthData.depthchart;
      // fallback: sometimes wrapped as a single object
      if (depthData?.depthchart) return [depthData.depthchart];
      return [];
    };

    const getAthleteName = (a: any): string | null => {
      return a?.displayName ?? a?.athlete?.displayName ?? a?.name ?? null;
    };

    const slotToPosition: Record<string, string> = {
      qb: 'QB',
      rb: 'RB',
      te: 'TE',
      wr1: 'WR',
      wr2: 'WR',
      wr3: 'WR',
      slotwr: 'WR',
    };

    const slotsToExtract = Object.keys(slotToPosition);

    let teamsProcessedForDepth = 0;
    const depthChartUpdates: any[] = [];

    // Reset existing markers/metadata for this season before applying fresh depth chart info
    await supabase
      .from('playoff_players')
      .update({
        is_starter: false,
        depth_chart_position: null,
        depth_chart_slot: null,
        depth_chart_rank: null,
        depth_chart_formation: null,
        depth_chart_updated_at: null,
      })
      .eq('season', season);

    const depthHeaders = {
      Accept: 'application/json',
      // ESPN endpoints sometimes vary response based on UA; provide a browser-like UA
      'User-Agent': 'Mozilla/5.0 (compatible; LovableSyncBot/1.0)',
    };

    for (const team of playoffTeams) {
      const espnTeamId = espnTeamIdMap[team.team_id];
      if (!espnTeamId) {
        console.log(`No ESPN team ID mapping for team_id ${team.team_id} (${team.name})`);
        continue;
      }

      try {
        const depthChartUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeamId}/depthcharts`;
        console.log(`Fetching depth chart for ${team.name} (ESPN ${espnTeamId})...`);

        const depthResponse = await fetch(depthChartUrl, { headers: depthHeaders });
        if (!depthResponse.ok) {
          console.error(`Failed to fetch depth chart for ${team.name}: ${depthResponse.status}`);
          continue;
        }

        const depthData = await depthResponse.json();
        const charts = extractCharts(depthData);

        const offenseChart = charts.find((c: any) => (c?.name ?? '').includes('3WR')) ?? charts[0];
        const positions = offenseChart?.positions;

        if (!offenseChart || !positions || typeof positions !== 'object' || Array.isArray(positions)) {
          console.log(
            `No valid offense depth chart found for ${team.name} (charts=${charts.length}, keys=${Object.keys(depthData || {}).join(',')})`
          );
          continue;
        }

        const formationName = offenseChart?.name ?? offenseChart?.displayName ?? null;
        const availableSlots = Object.keys(positions);
        console.log(`${team.name} depth chart slots: ${availableSlots.join(', ')}`);

        for (const slot of slotsToExtract) {
          const posObj = positions?.[slot];
          const athletes = Array.isArray(posObj?.athletes) ? posObj.athletes : [];
          if (athletes.length === 0) continue;

          const topAthletes = athletes.slice(0, 2); // starter + backup
          for (let rank = 0; rank < topAthletes.length; rank++) {
            const athleteName = getAthleteName(topAthletes[rank]);
            if (!athleteName) continue;

            const normalizedAthleteName = normalizeName(athleteName);
            const key = `${team.team_id}-${normalizedAthleteName}`;
            let playerId = nameToPlayerIdMap.get(key);
            let matchMethod = 'exact';
            
            // Fallback 1: Try nickname variants
            if (!playerId) {
              const nameParts = normalizedAthleteName.split(' ');
              if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                const restOfName = nameParts.slice(1).join(' ');
                const variants = nicknameMap[firstName] || [];
                for (const variant of variants) {
                  const variantKey = `${team.team_id}-${variant} ${restOfName}`;
                  playerId = nameToPlayerIdMap.get(variantKey);
                  if (playerId) {
                    matchMethod = 'nickname';
                    console.log(`Matched ${athleteName} via nickname: ${variant} ${restOfName}`);
                    break;
                  }
                }
              }
            }
            
            // Fallback 2: Try last name + position matching (only if unique)
            if (!playerId) {
              const lastName = getLastName(athleteName);
              const lastNameKey = `${team.team_id}-${lastName}`;
              const candidates = lastNameToPlayersMap.get(lastNameKey) || [];
              const expectedPosition = slotToPosition[slot];
              const positionMatches = candidates.filter(c => c.position === expectedPosition);
              
              if (positionMatches.length === 1) {
                playerId = positionMatches[0].player_id;
                matchMethod = 'lastname-position';
                console.log(`Matched ${athleteName} via last name + position: ${positionMatches[0].fullName}`);
              }
            }
            
            if (!playerId) {
              // Log unmatched ESPN player for debugging
              const lastName = getLastName(athleteName);
              const lastNameKey = `${team.team_id}-${lastName}`;
              const candidates = lastNameToPlayersMap.get(lastNameKey) || [];
              unmatchedEspnPlayers.push({
                team: team.name,
                slot,
                espnName: athleteName,
                normalizedName: normalizedAthleteName,
                possibleMatches: candidates.map(c => `${c.fullName} (${c.position})`).join(', ') || 'none',
              });
              continue;
            }

            const base = playersById.get(playerId);
            if (!base) continue;

            depthChartUpdates.push({
              ...base,
              is_starter: rank === 0,
              depth_chart_position: slotToPosition[slot],
              depth_chart_slot: slot,
              depth_chart_rank: rank,
              depth_chart_formation: formationName,
              depth_chart_updated_at: new Date().toISOString(),
            });
          }
        }

        teamsProcessedForDepth++;
      } catch (error) {
        console.error(`Error fetching depth chart for ${team.name}:`, error);
      }
    }

    // Log unmatched ESPN players for debugging
    if (unmatchedEspnPlayers.length > 0) {
      console.log(`⚠️ Unmatched ESPN players (${unmatchedEspnPlayers.length}):`);
      for (const unmatched of unmatchedEspnPlayers) {
        console.log(`  - ${unmatched.team} | ${unmatched.slot}: "${unmatched.espnName}" (normalized: "${unmatched.normalizedName}")`);
      }
    }

    console.log(`Depth chart updates prepared: ${depthChartUpdates.length} rows from ${teamsProcessedForDepth} teams`);

    // Apply updates (includes is_starter + depth chart metadata) using upsert on the same conflict key
    if (depthChartUpdates.length > 0) {
      const uniqueUpdates = new Map<string, any>();
      for (const u of depthChartUpdates) {
        const key = `${u.team_id}-${u.season}-${u.player_id}-${u.depth_chart_slot}`;
        // If a player appears multiple times for the same slot, keep the best (rank 0 preferred)
        const existing = uniqueUpdates.get(key);
        if (!existing || (existing.depth_chart_rank ?? 99) > (u.depth_chart_rank ?? 99)) {
          uniqueUpdates.set(key, u);
        }
      }

      // Note: We store one row per player; if the same player appears in multiple slots,
      // the last write wins. This keeps schema minimal while still surfacing useful data.
      const collapsedByPlayer = new Map<string, any>();
      for (const u of uniqueUpdates.values()) {
        const pKey = `${u.team_id}-${u.season}-${u.player_id}`;
        const existing = collapsedByPlayer.get(pKey);
        // Prefer starter designation / rank 0 if multiple slots
        if (!existing || (existing.depth_chart_rank ?? 99) > (u.depth_chart_rank ?? 99)) {
          collapsedByPlayer.set(pKey, u);
        }
      }

      const rows = Array.from(collapsedByPlayer.values());
      const { error: depthUpsertError } = await supabase
        .from('playoff_players')
        .upsert(rows, { onConflict: 'team_id,season,player_id', ignoreDuplicates: false });

      if (depthUpsertError) {
        console.error('Error upserting depth chart data:', depthUpsertError);
      } else {
        console.log(`Successfully upserted depth chart data for ${rows.length} players`);
      }
    }

    const startersMarked = depthChartUpdates.filter(u => u.is_starter).length;
    console.log(`Marked ${startersMarked} starters via depth chart data`);

    return new Response(
      JSON.stringify({
        success: true,
        playersSynced: syncedCount,
        teamsProcessed: playoffTeams.length,
        playersWithImages: withImages,
        positionBreakdown: {
          QB: dedupedPlayers.filter(p => p.position === 'QB').length,
          RB: dedupedPlayers.filter(p => p.position === 'RB').length,
          WR: dedupedPlayers.filter(p => p.position === 'WR').length,
          TE: dedupedPlayers.filter(p => p.position === 'TE').length,
        },
        depthChartSync: {
          teamsProcessed: teamsProcessedForDepth,
          startersMarked,
          unmatchedCount: unmatchedEspnPlayers.length,
          unmatchedPlayers: unmatchedEspnPlayers,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error syncing playoff players:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

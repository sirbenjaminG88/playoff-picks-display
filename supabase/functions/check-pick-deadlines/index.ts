import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_SLOTS = ["QB", "RB", "FLEX"];
const CURRENT_SEASON = 2025;

interface NotificationWindow {
  type: "24h" | "1h";
  weekIndex: number;
  weekLabel: string;
  hoursRemaining: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[check-pick-deadlines] Running at ${now.toISOString()}`);

    // Get all upcoming playoff games for the current season
    const { data: games, error: gamesError } = await supabase
      .from("playoff_games")
      .select("week_index, week_label, kickoff_at")
      .eq("season", CURRENT_SEASON)
      .gt("kickoff_at", now.toISOString())
      .order("kickoff_at", { ascending: true });

    if (gamesError) {
      console.error("Error fetching games:", gamesError);
      throw gamesError;
    }

    if (!games || games.length === 0) {
      console.log("No upcoming games found");
      return new Response(
        JSON.stringify({ message: "No upcoming games", notificationsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group games by week and get first kickoff for each week
    const weekFirstKickoffs = new Map<number, { kickoffAt: Date; weekLabel: string }>();
    for (const game of games) {
      if (!game.kickoff_at) continue;
      const kickoff = new Date(game.kickoff_at);
      const existing = weekFirstKickoffs.get(game.week_index);
      if (!existing || kickoff < existing.kickoffAt) {
        weekFirstKickoffs.set(game.week_index, {
          kickoffAt: kickoff,
          weekLabel: game.week_label,
        });
      }
    }

    // Check which weeks are in notification windows
    const activeWindows: NotificationWindow[] = [];
    
    for (const [weekIndex, { kickoffAt, weekLabel }] of weekFirstKickoffs) {
      const msUntilKickoff = kickoffAt.getTime() - now.getTime();
      const hoursUntilKickoff = msUntilKickoff / (1000 * 60 * 60);

      // 24-hour window: Between 24 hours and 23 hours before kickoff
      if (hoursUntilKickoff <= 24 && hoursUntilKickoff > 23) {
        activeWindows.push({
          type: "24h",
          weekIndex,
          weekLabel,
          hoursRemaining: Math.round(hoursUntilKickoff),
        });
        console.log(`Week ${weekIndex} (${weekLabel}) is in 24-hour notification window`);
      }

      // 1-hour window: Between 1 hour and 30 minutes before kickoff
      if (hoursUntilKickoff <= 1 && hoursUntilKickoff > 0.5) {
        activeWindows.push({
          type: "1h",
          weekIndex,
          weekLabel,
          hoursRemaining: 1,
        });
        console.log(`Week ${weekIndex} (${weekLabel}) is in 1-hour notification window`);
      }
    }

    if (activeWindows.length === 0) {
      console.log("No weeks in notification windows");
      return new Response(
        JSON.stringify({ message: "No active notification windows", notificationsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all leagues for the current season
    const { data: leagues, error: leaguesError } = await supabase
      .from("leagues")
      .select("id")
      .eq("season", CURRENT_SEASON);

    if (leaguesError) {
      console.error("Error fetching leagues:", leaguesError);
      throw leaguesError;
    }

    if (!leagues || leagues.length === 0) {
      console.log("No leagues found for season", CURRENT_SEASON);
      return new Response(
        JSON.stringify({ message: "No leagues found", notificationsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leagueIds = leagues.map((l) => l.id);

    // Get all league members
    const { data: members, error: membersError } = await supabase
      .from("league_members")
      .select("user_id, league_id")
      .in("league_id", leagueIds);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      throw membersError;
    }

    if (!members || members.length === 0) {
      console.log("No league members found");
      return new Response(
        JSON.stringify({ message: "No league members", notificationsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { window: NotificationWindow; usersNotified: number }[] = [];

    for (const window of activeWindows) {
      // Get all picks for this week
      const { data: picks, error: picksError } = await supabase
        .from("user_picks")
        .select("auth_user_id, position_slot")
        .eq("season", CURRENT_SEASON)
        .eq("week", window.weekIndex);

      if (picksError) {
        console.error(`Error fetching picks for week ${window.weekIndex}:`, picksError);
        continue;
      }

      // Group picks by user and check completeness
      const userPickSlots = new Map<string, Set<string>>();
      for (const pick of picks || []) {
        if (!pick.auth_user_id) continue;
        if (!userPickSlots.has(pick.auth_user_id)) {
          userPickSlots.set(pick.auth_user_id, new Set());
        }
        userPickSlots.get(pick.auth_user_id)!.add(pick.position_slot);
      }

      // Find users without complete picks
      const usersWithoutCompletePicks: string[] = [];
      for (const member of members) {
        const userId = member.user_id;
        const slots = userPickSlots.get(userId);
        const hasAllSlots = slots && REQUIRED_SLOTS.every((s) => slots.has(s));
        
        if (!hasAllSlots) {
          usersWithoutCompletePicks.push(userId);
        }
      }

      // Remove duplicates
      const uniqueUsers = [...new Set(usersWithoutCompletePicks)];

      if (uniqueUsers.length === 0) {
        console.log(`All users have complete picks for week ${window.weekIndex}`);
        results.push({ window, usersNotified: 0 });
        continue;
      }

      console.log(`Found ${uniqueUsers.length} users without complete picks for week ${window.weekIndex}`);

      // Get push tokens for these users
      const { data: tokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("user_id")
        .in("user_id", uniqueUsers);

      if (tokensError) {
        console.error("Error fetching push tokens:", tokensError);
        continue;
      }

      const usersWithTokens = [...new Set((tokens || []).map((t) => t.user_id))];

      if (usersWithTokens.length === 0) {
        console.log("No users with push tokens to notify");
        results.push({ window, usersNotified: 0 });
        continue;
      }

      console.log(`Sending notifications to ${usersWithTokens.length} users for ${window.weekLabel}`);

      // Call send-pick-deadline-notifications function
      const title = "Pick Deadline Reminder";
      const message =
        window.type === "24h"
          ? `Your picks for ${window.weekLabel} are due in 24 hours!`
          : `Your picks for ${window.weekLabel} are due in 1 hour!`;

      const notifyResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-pick-deadline-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            title,
            message,
            userIds: usersWithTokens,
          }),
        }
      );

      if (!notifyResponse.ok) {
        const errorText = await notifyResponse.text();
        console.error("Failed to send notifications:", errorText);
        results.push({ window, usersNotified: 0 });
        continue;
      }

      const notifyResult = await notifyResponse.json();
      console.log(`Notification result for ${window.weekLabel}:`, notifyResult);
      results.push({ window, usersNotified: usersWithTokens.length });
    }

    const totalNotified = results.reduce((sum, r) => sum + r.usersNotified, 0);
    const summary = {
      checkedAt: now.toISOString(),
      activeWindows: activeWindows.length,
      results: results.map((r) => ({
        weekLabel: r.window.weekLabel,
        windowType: r.window.type,
        usersNotified: r.usersNotified,
      })),
      totalNotificationsSent: totalNotified,
    };

    console.log("Check complete:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-pick-deadlines:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

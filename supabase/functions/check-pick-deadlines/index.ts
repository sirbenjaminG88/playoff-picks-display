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
  week: number;
  weekLabel: string;
  gameType: "regular" | "playoff";
  firstGameTime: Date;
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

    // Get upcoming games from both regular season and playoffs
    const upcomingWeeks = new Map<string, { week: number; weekLabel: string; gameType: "regular" | "playoff"; firstGameTime: Date }>();

    // Fetch regular season games
    const { data: regularGames, error: regularError } = await supabase
      .from("regular_season_games")
      .select("week, game_date")
      .eq("season", CURRENT_SEASON)
      .gt("game_date", now.toISOString())
      .order("game_date", { ascending: true });

    if (regularError) {
      console.error("Error fetching regular season games:", regularError);
    } else if (regularGames && regularGames.length > 0) {
      for (const game of regularGames) {
        if (!game.game_date) continue;
        const key = `regular-${game.week}`;
        const gameTime = new Date(game.game_date);
        const existing = upcomingWeeks.get(key);
        if (!existing || gameTime < existing.firstGameTime) {
          upcomingWeeks.set(key, {
            week: game.week,
            weekLabel: `Week ${game.week}`,
            gameType: "regular",
            firstGameTime: gameTime,
          });
        }
      }
    }

    // Fetch playoff games
    const { data: playoffGames, error: playoffError } = await supabase
      .from("playoff_games")
      .select("week_index, week_label, kickoff_at")
      .eq("season", CURRENT_SEASON)
      .gt("kickoff_at", now.toISOString())
      .order("kickoff_at", { ascending: true });

    if (playoffError) {
      console.error("Error fetching playoff games:", playoffError);
    } else if (playoffGames && playoffGames.length > 0) {
      for (const game of playoffGames) {
        if (!game.kickoff_at) continue;
        const key = `playoff-${game.week_index}`;
        const gameTime = new Date(game.kickoff_at);
        const existing = upcomingWeeks.get(key);
        if (!existing || gameTime < existing.firstGameTime) {
          upcomingWeeks.set(key, {
            week: game.week_index,
            weekLabel: game.week_label,
            gameType: "playoff",
            firstGameTime: gameTime,
          });
        }
      }
    }

    if (upcomingWeeks.size === 0) {
      console.log("No upcoming games found");
      return new Response(
        JSON.stringify({ message: "No upcoming games", notificationsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${upcomingWeeks.size} upcoming weeks with games`);

    // Check which weeks are in notification windows
    const activeWindows: NotificationWindow[] = [];
    
    for (const [key, weekData] of upcomingWeeks) {
      const msUntilKickoff = weekData.firstGameTime.getTime() - now.getTime();
      const hoursUntilKickoff = msUntilKickoff / (1000 * 60 * 60);

      // 24-hour window: Between 23 and 25 hours before kickoff (1 hour tolerance)
      if (hoursUntilKickoff >= 23 && hoursUntilKickoff <= 25) {
        activeWindows.push({
          type: "24h",
          week: weekData.week,
          weekLabel: weekData.weekLabel,
          gameType: weekData.gameType,
          firstGameTime: weekData.firstGameTime,
        });
        console.log(`${weekData.weekLabel} (${weekData.gameType}) is in 24-hour notification window (${hoursUntilKickoff.toFixed(1)}h until kickoff)`);
      }

      // 1-hour window: Between 50 minutes and 70 minutes before kickoff
      if (hoursUntilKickoff >= 0.83 && hoursUntilKickoff <= 1.17) {
        activeWindows.push({
          type: "1h",
          week: weekData.week,
          weekLabel: weekData.weekLabel,
          gameType: weekData.gameType,
          firstGameTime: weekData.firstGameTime,
        });
        console.log(`${weekData.weekLabel} (${weekData.gameType}) is in 1-hour notification window (${(hoursUntilKickoff * 60).toFixed(0)} minutes until kickoff)`);
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
      // Check which users have already been reminded for this window
      const { data: alreadyReminded, error: reminderLogError } = await supabase
        .from("pick_reminder_sent_log")
        .select("user_id")
        .eq("season", CURRENT_SEASON)
        .eq("week", window.week)
        .eq("reminder_type", window.type);

      if (reminderLogError) {
        console.error("Error checking reminder log:", reminderLogError);
      }

      const alreadyRemindedUserIds = new Set((alreadyReminded || []).map(r => r.user_id));
      console.log(`${alreadyRemindedUserIds.size} users already reminded for ${window.weekLabel} (${window.type})`);

      // Get all picks for this week
      const { data: picks, error: picksError } = await supabase
        .from("user_picks")
        .select("auth_user_id, league_id, position_slot")
        .eq("season", CURRENT_SEASON)
        .eq("week", window.week);

      if (picksError) {
        console.error(`Error fetching picks for week ${window.week}:`, picksError);
        continue;
      }

      // Group picks by user+league and check completeness
      const userLeaguePickSlots = new Map<string, Set<string>>();
      for (const pick of picks || []) {
        if (!pick.auth_user_id) continue;
        const key = `${pick.auth_user_id}-${pick.league_id}`;
        if (!userLeaguePickSlots.has(key)) {
          userLeaguePickSlots.set(key, new Set());
        }
        userLeaguePickSlots.get(key)!.add(pick.position_slot);
      }

      // Find users without complete picks who haven't been reminded
      const usersToNotify: string[] = [];
      const userLeaguesToLog: { userId: string; leagueId: string }[] = [];

      for (const member of members) {
        const userId = member.user_id;
        const leagueId = member.league_id;
        
        // Skip if already reminded
        if (alreadyRemindedUserIds.has(userId)) continue;
        
        const key = `${userId}-${leagueId}`;
        const slots = userLeaguePickSlots.get(key);
        const hasAllSlots = slots && REQUIRED_SLOTS.every((s) => slots.has(s));
        
        if (!hasAllSlots) {
          usersToNotify.push(userId);
          userLeaguesToLog.push({ userId, leagueId });
        }
      }

      // Remove duplicates (user might be in multiple leagues)
      const uniqueUsers = [...new Set(usersToNotify)];

      if (uniqueUsers.length === 0) {
        console.log(`All users have complete picks or already reminded for week ${window.week}`);
        results.push({ window, usersNotified: 0 });
        continue;
      }

      console.log(`Found ${uniqueUsers.length} users to notify for ${window.weekLabel}`);

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
          ? `Games start in 24 hours! Don't forget to submit your picks for ${window.weekLabel}.`
          : `Games start in 1 hour! Submit your picks for ${window.weekLabel} now!`;

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

      // Log sent reminders to prevent duplicates
      const reminderLogs = userLeaguesToLog
        .filter(ul => usersWithTokens.includes(ul.userId))
        .map(ul => ({
          user_id: ul.userId,
          league_id: ul.leagueId,
          season: CURRENT_SEASON,
          week: window.week,
          reminder_type: window.type,
        }));

      if (reminderLogs.length > 0) {
        const { error: logError } = await supabase
          .from("pick_reminder_sent_log")
          .upsert(reminderLogs, { onConflict: "user_id,league_id,season,week,reminder_type" });

        if (logError) {
          console.error("Error logging reminders:", logError);
        } else {
          console.log(`Logged ${reminderLogs.length} reminder records`);
        }
      }

      results.push({ window, usersNotified: usersWithTokens.length });
    }

    const totalNotified = results.reduce((sum, r) => sum + r.usersNotified, 0);
    const summary = {
      checkedAt: now.toISOString(),
      activeWindows: activeWindows.length,
      results: results.map((r) => ({
        weekLabel: r.window.weekLabel,
        gameType: r.window.gameType,
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

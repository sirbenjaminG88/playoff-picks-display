import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClipboardList, CheckCircle2, Info, ChevronRight, Lock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { teamColorMap } from "@/lib/teamColors";
import { getWeekStatus, getCurrentOpenWeek } from "@/lib/weekStatus";
import { usePlayoffSchedule } from "@/hooks/usePlayoffSchedule";
import { formatDeadlineET, formatGameDateET } from "@/lib/timezone";
import { Pick, Week } from "@/domain/types";
import { supabase } from "@/integrations/supabase/client";
import { getWeekLabel, getWeekTabLabel } from "@/data/weekLabels";
import { useLeague } from "@/contexts/LeagueContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRegularSeasonData, RegularSeasonPlayer } from "@/hooks/useRegularSeasonData";
import { PageHeader } from "@/components/PageHeader";
import { QBIcon, RBIcon, FlexIcon } from "@/components/PositionIcons";

type PositionSlot = "QB" | "RB" | "FLEX";

interface PlayoffPlayer {
  id: string;
  player_id: number;
  name: string;
  position: string;
  team_name: string;
  team_id: number;
  number: string | null;
  image_url: string | null;
}

// Unified player type for both modes
interface UnifiedPlayer {
  id: string;
  playerId: number | string;
  name: string;
  position: string;
  teamName: string;
  teamAbbr: string;
  teamId: number | string;
  number: string | null;
  imageUrl: string | null;
}

type WeekPicks = {
  qb?: UnifiedPlayer;
  rb?: UnifiedPlayer;
  flex?: UnifiedPlayer;
  submitted: boolean;
  submittedAt?: string;
};

// Debug time override - set to true to test Week 1 as open
const USE_DEBUG_TIME = false;
const DEBUG_NOW = new Date("2025-01-10T12:00:00-05:00");

// Get team abbreviation for display - hoisted to top level
const getTeamAbbrev = (teamName: string): string => {
  const abbrevMap: Record<string, string> = {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS",
  };
  return abbrevMap[teamName] || teamName.substring(0, 3).toUpperCase();
};

const Picks = () => {
  const { currentLeague, isCommissioner, loading: leagueLoading } = useLeague();
  const { profile, user, loading: authLoading, isAdmin } = useAuth();
  
  // Derive isRegularSeason from current league's season_type
  const isRegularSeason = currentLeague?.season_type === "REG";
  const CURRENT_TIME = USE_DEBUG_TIME ? DEBUG_NOW : new Date();

  // Regular season data
  const {
    players: regularSeasonPlayers,
    weeks: regularSeasonWeeks,
    domainWeeks: regularDomainWeeks,
    loading: loadingRegularSeason
  } = useRegularSeasonData(2025);

  // Playoff data
  const [playoffPlayers, setPlayoffPlayers] = useState<PlayoffPlayer[]>([]);
  const [loadingPlayoffs, setLoadingPlayoffs] = useState(true);
  const { weeks: playoffWeeks, loading: loadingPlayoffSchedule } = usePlayoffSchedule(2025);

  // Determine which weeks to use - ensure we always have a valid array
  const activeWeeks = isRegularSeason ? (regularDomainWeeks.length > 0 ? regularDomainWeeks : []) : playoffWeeks;
  const defaultWeek = isRegularSeason ? "14" : (getCurrentOpenWeek(playoffWeeks, CURRENT_TIME)?.weekNumber?.toString() ?? "1");

  const [activeWeek, setActiveWeek] = useState<string>(defaultWeek);
  const [picksByWeek, setPicksByWeek] = useState<Record<number, WeekPicks>>({});

  // Sheet state for player selection
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState<{
    weekNumber: number;
    positionSlot: PositionSlot;
    label: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [weekToSubmit, setWeekToSubmit] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [weekToReset, setWeekToReset] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Reset active week when season changes
  useEffect(() => {
    const newDefaultWeek = isRegularSeason ? "14" : "1";
    setActiveWeek(newDefaultWeek);
    // Don't reset picksByWeek here - let the fetch effect handle it
  }, [isRegularSeason]);

  // Initialize picksByWeek structure when weeks are available
  // This should only set up empty entries for weeks that don't exist yet
  // NOTE: This effect should NOT reset picks loaded from the database
  useEffect(() => {
    if (activeWeeks.length === 0) return;
    
    const weekNums = activeWeeks.map(w => w.weekNumber);
    
    setPicksByWeek(prev => {
      // Always preserve existing data - just ensure all weeks exist
      const updated = { ...prev };
      for (const w of weekNums) {
        if (!updated[w]) {
          updated[w] = { submitted: false };
        }
      }
      return updated;
    });
    
    // Also ensure activeWeek is valid for current weeks
    setActiveWeek(prev => {
      const validWeeks = weekNums.map(String);
      if (!validWeeks.includes(prev)) {
        return validWeeks[0] || (isRegularSeason ? "14" : "1");
      }
      return prev;
    });
  }, [activeWeeks, isRegularSeason]);

  // Fetch playoff players
  useEffect(() => {
    if (isRegularSeason) return;

    const fetchPlayers = async () => {
      setLoadingPlayoffs(true);
      const { data, error } = await supabase
        .from("playoff_players")
        .select("*")
        .eq("season", 2025)
        .eq("group", "Offense")
        .or(
          "and(depth_chart_slot.eq.qb,depth_chart_rank.in.(0,1))," +
          "and(depth_chart_slot.eq.rb,depth_chart_rank.in.(0,1))," +
          "and(depth_chart_slot.in.(wr1,wr2,wr3),depth_chart_rank.eq.0)," +
          "and(depth_chart_slot.eq.te,depth_chart_rank.in.(0,1))"
        )
        .order("team_name")
        .order("name");

      if (error) {
        console.error("Error fetching players:", error);
        toast({
          title: "Error loading players",
          description: "Failed to load player data. Please try again.",
          variant: "destructive",
        });
      } else {
        setPlayoffPlayers(data || []);
      }
      setLoadingPlayoffs(false);
    };

    fetchPlayers();
  }, [isRegularSeason]);

  // DEBUG state for showing query results
  const [debugInfo, setDebugInfo] = useState<{
    authUserId: string | null;
    leagueId: string | null;
    season: number;
    week: number;
    rows: any[];
    error: any;
  } | null>(null);

  // Fetch existing picks for the user
  useEffect(() => {
    // Wait for auth and league to finish loading
    if (authLoading || leagueLoading) {
      console.log("[Picks] Still loading auth/league...", { authLoading, leagueLoading });
      return;
    }
    
    if (!user?.id) {
      console.log("[Picks] No user ID");
      return;
    }
    
    if (!currentLeague?.id) {
      console.log("[Picks] No current league", { currentLeague });
      return;
    }

    const fetchUserPicks = async () => {
      const season = isRegularSeason ? 2025 : 2025;
      const leagueId = currentLeague.id;
      const currentWeekNum = parseInt(activeWeek, 10);
      
      console.log("[Picks] Fetching picks for:", { userId: user.id, leagueId, season });
      
      // DEBUG: Run the exact query you specified
      const debugQuery = await supabase
        .from("user_picks")
        .select("id, league_id, season, week, position_slot, player_name, auth_user_id")
        .eq("auth_user_id", user.id)
        .eq("league_id", leagueId)
        .eq("season", season)
        .eq("week", currentWeekNum);
      
      console.log('DEBUG existing picks', {
        authUserId: user.id,
        leagueId: leagueId,
        season: season,
        week: currentWeekNum,
        rows: debugQuery.data,
        error: debugQuery.error,
      });
      
      setDebugInfo({
        authUserId: user.id,
        leagueId: leagueId,
        season: season,
        week: currentWeekNum,
        rows: debugQuery.data || [],
        error: debugQuery.error,
      });
      
      // Now fetch ALL picks for this season (not just one week)
      const { data, error } = await supabase
        .from("user_picks")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("league_id", leagueId)
        .eq("season", season);

      if (error) {
        console.error("[Picks] Error fetching user picks:", error);
        return;
      }

      console.log("[Picks] Fetched picks:", data?.length, "rows", data);

      // Initialize picksByWeek structure with empty weeks first
      const picksByWeekMap: Record<number, WeekPicks> = {};
      
      // Use BETA weeks for regular season, or activeWeeks
      const weekNums = isRegularSeason ? [14, 15, 16, 17, 18] : activeWeeks.map(w => w.weekNumber);
      for (const w of weekNums) {
        picksByWeekMap[w] = { submitted: false };
      }

      if (data && data.length > 0) {
        // Get unique player IDs to fetch their images
        const playerIds = [...new Set(data.map(p => p.player_id))];
        
        // Fetch player images
        let playerImageMap = new Map<number, string | null>();
        
        if (isRegularSeason) {
          const { data: players } = await supabase
            .from("players")
            .select("api_player_id, image_url")
            .eq("season", season)
            .in("api_player_id", playerIds.map(String));
          
          players?.forEach(p => {
            playerImageMap.set(parseInt(p.api_player_id), p.image_url);
          });
        } else {
          const { data: players } = await supabase
            .from("playoff_players")
            .select("player_id, image_url")
            .eq("season", season)
            .in("player_id", playerIds);
          
          players?.forEach(p => {
            playerImageMap.set(p.player_id, p.image_url);
          });
        }

        data.forEach((pick) => {
          const week = pick.week;
          if (!picksByWeekMap[week]) {
            picksByWeekMap[week] = { submitted: false };
          }

          const player: UnifiedPlayer = {
            id: pick.id,
            playerId: pick.player_id,
            name: pick.player_name,
            position: pick.position,
            teamName: pick.team_name,
            teamAbbr: getTeamAbbrev(pick.team_name),
            teamId: pick.team_id,
            number: null,
            imageUrl: playerImageMap.get(pick.player_id) ?? null,
          };

          if (pick.position_slot === "QB") {
            picksByWeekMap[week].qb = player;
          } else if (pick.position_slot === "RB") {
            picksByWeekMap[week].rb = player;
          } else if (pick.position_slot === "FLEX") {
            picksByWeekMap[week].flex = player;
          }

          // Mark as submitted if we have picks
          picksByWeekMap[week].submitted = true;
          picksByWeekMap[week].submittedAt = pick.submitted_at;
        });
        
        console.log("[Picks] Processed picks by week:", Object.keys(picksByWeekMap).map(k => ({
          week: k,
          weekAsNumber: Number(k),
          qb: picksByWeekMap[Number(k)]?.qb?.name,
          rb: picksByWeekMap[Number(k)]?.rb?.name,
          flex: picksByWeekMap[Number(k)]?.flex?.name,
          submitted: picksByWeekMap[Number(k)]?.submitted
        })));
      }

      setPicksByWeek(picksByWeekMap);
    };

    fetchUserPicks();
  }, [user?.id, currentLeague?.id, isRegularSeason, authLoading, leagueLoading, activeWeek]);

  // Convert players to unified format
  const allPlayers: UnifiedPlayer[] = useMemo(() => {
    if (isRegularSeason) {
      return regularSeasonPlayers.map(p => ({
        id: p.id,
        playerId: parseInt(p.api_player_id, 10) || p.api_player_id,
        name: p.full_name,
        position: p.position,
        teamName: p.team_name || "Unknown",
        teamAbbr: p.team_abbr || "UNK",
        teamId: p.team_api_id || "0",
        number: p.jersey_number,
        imageUrl: p.image_url,
      }));
    } else {
      return playoffPlayers.map(p => ({
        id: p.id,
        playerId: p.player_id,
        name: p.name,
        position: p.position,
        teamName: p.team_name,
        teamAbbr: getTeamAbbrev(p.team_name),
        teamId: p.team_id,
        number: p.number,
        imageUrl: p.image_url,
      }));
    }
  }, [isRegularSeason, regularSeasonPlayers, playoffPlayers]);

  const loadingPlayers = isRegularSeason ? loadingRegularSeason : loadingPlayoffs;
  const loadingSchedule = isRegularSeason ? loadingRegularSeason : loadingPlayoffSchedule;
  const isLoading = loadingPlayers || loadingSchedule;

  const handleOpenSheet = (weekNumber: number, positionSlot: PositionSlot, label: string) => {
    setSheetConfig({ weekNumber, positionSlot, label });
    setSearchTerm("");
    setSheetOpen(true);
  };

  // Helper to get all player IDs picked in previous weeks by current user
  const getAlreadyPickedPlayerIds = (currentWeekNum: number): Set<number | string> => {
    const pickedIds = new Set<number | string>();
    // Only look at weeks BEFORE the current week
    for (const week of activeWeeks) {
      if (week.weekNumber >= currentWeekNum) continue;
      const picks = picksByWeek[week.weekNumber];
      if (picks?.qb) pickedIds.add(picks.qb.playerId);
      if (picks?.rb) pickedIds.add(picks.rb.playerId);
      if (picks?.flex) pickedIds.add(picks.flex.playerId);
    }
    return pickedIds;
  };

  const handleSelectPlayer = (player: UnifiedPlayer) => {
    if (!sheetConfig) return;

    const { weekNumber, positionSlot } = sheetConfig;
    const slotKey = positionSlot.toLowerCase() as "qb" | "rb" | "flex";

    setPicksByWeek((prev) => ({
      ...prev,
      [weekNumber]: {
        ...prev[weekNumber],
        [slotKey]: player,
      },
    }));

    setSheetOpen(false);
    setSheetConfig(null);
  };

  const handleSubmitClick = (weekNumber: number) => {
    const weekPicks = picksByWeek[weekNumber];

    if (!weekPicks?.qb || !weekPicks?.rb || !weekPicks?.flex) {
      toast({
        title: "Incomplete picks",
        description: "Please select a player for all three positions before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Open confirmation dialog
    setWeekToSubmit(weekNumber);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (weekToSubmit === null || !user?.id || !profile?.display_name || !currentLeague) return;

    const weekPicks = picksByWeek[weekToSubmit];
    if (!weekPicks?.qb || !weekPicks?.rb || !weekPicks?.flex) return;

    setIsSubmitting(true);

    try {
      const season = isRegularSeason ? 2025 : 2025;
      
      // Prepare the picks to insert
      const picksToInsert = [
        {
          auth_user_id: user.id,
          user_id: profile.display_name,
          league_id: currentLeague.id,
          season: season,
          week: weekToSubmit,
          position_slot: "QB",
          player_id: typeof weekPicks.qb.playerId === 'string' ? parseInt(weekPicks.qb.playerId, 10) : weekPicks.qb.playerId,
          player_name: weekPicks.qb.name,
          team_id: typeof weekPicks.qb.teamId === 'string' ? parseInt(weekPicks.qb.teamId, 10) : weekPicks.qb.teamId,
          team_name: weekPicks.qb.teamName,
          position: weekPicks.qb.position,
        },
        {
          auth_user_id: user.id,
          user_id: profile.display_name,
          league_id: currentLeague.id,
          season: season,
          week: weekToSubmit,
          position_slot: "RB",
          player_id: typeof weekPicks.rb.playerId === 'string' ? parseInt(weekPicks.rb.playerId, 10) : weekPicks.rb.playerId,
          player_name: weekPicks.rb.name,
          team_id: typeof weekPicks.rb.teamId === 'string' ? parseInt(weekPicks.rb.teamId, 10) : weekPicks.rb.teamId,
          team_name: weekPicks.rb.teamName,
          position: weekPicks.rb.position,
        },
        {
          auth_user_id: user.id,
          user_id: profile.display_name,
          league_id: currentLeague.id,
          season: season,
          week: weekToSubmit,
          position_slot: "FLEX",
          player_id: typeof weekPicks.flex.playerId === 'string' ? parseInt(weekPicks.flex.playerId, 10) : weekPicks.flex.playerId,
          player_name: weekPicks.flex.name,
          team_id: typeof weekPicks.flex.teamId === 'string' ? parseInt(weekPicks.flex.teamId, 10) : weekPicks.flex.teamId,
          team_name: weekPicks.flex.teamName,
          position: weekPicks.flex.position,
        },
      ];

      const { error } = await supabase
        .from("user_picks")
        .upsert(picksToInsert, {
          onConflict: "auth_user_id,league_id,season,week,position_slot",
        });

      if (error) {
        console.error("Error submitting picks:", error);
        toast({
          title: "Error submitting picks",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setPicksByWeek((prev) => ({
        ...prev,
        [weekToSubmit]: {
          ...prev[weekToSubmit],
          submitted: true,
          submittedAt: new Date().toISOString(),
        },
      }));

      const weekLabel = isRegularSeason ? `Week ${weekToSubmit}` : getWeekLabel(weekToSubmit);
      toast({
        title: `${weekLabel} picks submitted!`,
        description: "Your picks have been saved and locked.",
      });
    } catch (err) {
      console.error("Error submitting picks:", err);
      toast({
        title: "Error",
        description: "Failed to submit picks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      setWeekToSubmit(null);
    }
  };

  // Handle reset picks for a week
  const handleResetClick = (weekNumber: number) => {
    setWeekToReset(weekNumber);
    setShowResetDialog(true);
  };

  const handleConfirmReset = async () => {
    if (weekToReset === null || !user?.id || !currentLeague) return;

    setIsResetting(true);

    try {
      const season = isRegularSeason ? 2025 : 2025;
      
      const { error } = await supabase
        .from("user_picks")
        .delete()
        .eq("auth_user_id", user.id)
        .eq("league_id", currentLeague.id)
        .eq("season", season)
        .eq("week", weekToReset);

      if (error) {
        console.error("Error resetting picks:", error);
        toast({
          title: "Error resetting picks",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Reset local state for this week
      setPicksByWeek((prev) => ({
        ...prev,
        [weekToReset]: {
          qb: undefined,
          rb: undefined,
          flex: undefined,
          submitted: false,
          submittedAt: undefined,
        },
      }));

      const weekLabel = isRegularSeason ? `Week ${weekToReset}` : getWeekLabel(weekToReset);
      toast({
        title: `${weekLabel} picks cleared`,
        description: "You can now make new selections.",
      });
    } catch (err) {
      console.error("Error resetting picks:", err);
      toast({
        title: "Error",
        description: "Failed to reset picks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
      setWeekToReset(null);
    }
  };

  // Filter players for the sheet
  const getFilteredPlayers = (): UnifiedPlayer[] => {
    if (!sheetConfig) return [];

    const { positionSlot } = sheetConfig;

    // Filter by position
    let filtered = allPlayers;
    if (positionSlot === "QB") {
      filtered = allPlayers.filter((p) => p.position === "QB");
    } else if (positionSlot === "RB") {
      filtered = allPlayers.filter((p) => p.position === "RB");
    } else if (positionSlot === "FLEX") {
      filtered = allPlayers.filter((p) => p.position === "WR" || p.position === "TE");
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) || 
          p.teamName.toLowerCase().includes(searchLower) ||
          p.teamAbbr.toLowerCase().includes(searchLower)
      );
    }

    // Sort by team_name then name
    return filtered.sort((a, b) => {
      const teamCompare = a.teamName.localeCompare(b.teamName);
      if (teamCompare !== 0) return teamCompare;
      return a.name.localeCompare(b.name);
    });
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case "QB":
        return "bg-red-500";
      case "RB":
        return "bg-blue-500";
      case "WR":
      case "TE":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPlayerInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };


  // Get week label based on mode
  const getDisplayWeekLabel = (weekNum: number): string => {
    if (isRegularSeason) {
      return `Week ${weekNum}`;
    }
    return getWeekLabel(weekNum);
  };

  // Get tab label based on mode
  const getDisplayTabLabel = (weekNum: number): { abbrev: string; dates: string } => {
    if (isRegularSeason) {
      const weekData = regularSeasonWeeks.find(w => w.week === weekNum);
      return weekData?.tabLabel || { abbrev: `WK ${weekNum}`, dates: "" };
    }
    return getWeekTabLabel(weekNum);
  };

  return (
    <div className="bg-background pb-20">
      <PageHeader
        title="Submissions"
        subtitle={isRegularSeason
          ? "Pick 1 QB, 1 RB, and 1 FLEX each week"
          : "Pick a QB, RB and FLEX each playoff week."}
        icon={<ClipboardList className="w-6 h-6 text-primary" />}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading || activeWeeks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs value={activeWeek} onValueChange={(v) => setActiveWeek(v)} className="w-full">
            <TabsList className="w-full flex overflow-x-auto mb-8 h-auto p-1 bg-muted/50 border border-border gap-1">
              {activeWeeks.map((week) => {
                const weekNum = week.weekNumber;
                const weekPicks = picksByWeek[weekNum] || { submitted: false };
                
                // Convert local picks to Pick[] format for status check
                const userPicksForWeek: Pick[] = [];
                if (weekPicks.submitted) {
                  if (weekPicks.qb) userPicksForWeek.push({ positionSlot: "QB" } as Pick);
                  if (weekPicks.rb) userPicksForWeek.push({ positionSlot: "RB" } as Pick);
                  if (weekPicks.flex) userPicksForWeek.push({ positionSlot: "FLEX" } as Pick);
                }
                
                const status = getWeekStatus({ week, userPicksForWeek, now: CURRENT_TIME });
                const value = week.weekNumber.toString();
                const isFuture = status === "FUTURE_LOCKED";
                const tabLabel = getDisplayTabLabel(weekNum);

                return (
                  <TabsTrigger
                    key={week.id}
                    value={value}
                    disabled={isFuture}
                    className={cn(
                      "flex-1 min-w-[70px] px-2 py-2 flex flex-col items-center gap-0.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                      isFuture && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      if (isFuture) {
                        e.preventDefault();
                        toast({
                          title: "Week not available",
                          description: `${getDisplayWeekLabel(week.weekNumber)} picks open on ${formatGameDateET(week.openAt)}`,
                        });
                        return;
                      }
                    }}
                  >
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">{tabLabel.abbrev}</span>
                    <span className="text-[9px] sm:text-[10px] font-medium opacity-70">{tabLabel.dates}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {activeWeeks.map((week) => {
              const weekNum = week.weekNumber;
              const weekPicks = picksByWeek[weekNum] || { submitted: false };
              const isSubmitted = weekPicks.submitted;
              const allSlotsSelected = weekPicks.qb && weekPicks.rb && weekPicks.flex;
              
              // Convert local picks to Pick[] format for status check
              const userPicksForWeek: Pick[] = [];
              if (weekPicks.submitted) {
                if (weekPicks.qb) userPicksForWeek.push({ positionSlot: "QB" } as Pick);
                if (weekPicks.rb) userPicksForWeek.push({ positionSlot: "RB" } as Pick);
                if (weekPicks.flex) userPicksForWeek.push({ positionSlot: "FLEX" } as Pick);
              }
              
              const status = getWeekStatus({ week, userPicksForWeek, now: CURRENT_TIME });
              const isOpen = status === "OPEN_NOT_SUBMITTED";
              const isPastNoPicks = status === "PAST_NO_PICKS";
              const isFuture = status === "FUTURE_LOCKED";
              const isSubmittedState = status === "SUBMITTED";
              const weekLabel = getDisplayWeekLabel(weekNum);

              return (
                <TabsContent key={week.id} value={weekNum.toString()} className="mt-0">
                  {/* Status Banner */}
                  <div className="mb-6">
                    {isFuture && (
                      <Alert className="mb-4 border-border bg-muted/20">
                        <Lock className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-1 text-foreground">{weekLabel} picks are not open yet.</div>
                          <div className="text-sm text-muted-foreground">{weekLabel} opens on {formatGameDateET(week.openAt)}.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isOpen && (
                      <Alert className="mb-4 bg-primary/10 border-primary/30">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <div className="font-semibold mb-1 text-primary">Make your picks for {weekLabel}</div>
                          <div className="text-sm text-muted-foreground">Picks are due by {formatGameDateET(week.deadlineAt)}.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isSubmittedState && (
                      <Alert className="mb-4 bg-primary/10 border-primary/30">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <div className="font-semibold mb-1 text-primary">Your picks for {weekLabel} have been submitted.</div>
                          <div className="text-sm text-muted-foreground">
                            Submitted on {weekPicks.submittedAt ? formatGameDateET(weekPicks.submittedAt) : "just now"}. You can't change picks after submitting.
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isPastNoPicks && (
                      <Alert className="mb-4 border-destructive/50 bg-destructive/10" variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-1">{weekLabel} is complete.</div>
                          <div className="text-sm">You didn't submit picks for this week.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">{weekLabel} Picks</h2>
                      {/* Admin reset button */}
                      {isCommissioner && (weekPicks.qb || weekPicks.rb || weekPicks.flex || weekPicks.submitted) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetClick(weekNum);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Reset {weekLabel}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* QB Section */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <QBIcon className="text-primary" />
                      Quarterback
                    </h3>
                    <Card
                      className={cn(
                        "transition-all border-border",
                        isOpen && "cursor-pointer hover:bg-muted/10 hover:border-primary/50",
                        (isFuture || isPastNoPicks) && "opacity-60"
                      )}
                      onClick={() => isOpen && handleOpenSheet(weekNum, "QB", "Quarterback")}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {weekPicks.qb && (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-foreground/80 flex items-center justify-center text-xs font-semibold shrink-0 text-background">
                              {weekPicks.qb.imageUrl ? (
                                <img src={weekPicks.qb.imageUrl} alt={weekPicks.qb.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{getPlayerInitials(weekPicks.qb.name)}</span>
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">QB</p>
                            {weekPicks.qb ? (
                              <div>
                                <p className="font-semibold">{weekPicks.qb.name}</p>
                                <p className="text-sm text-muted-foreground">{weekPicks.qb.teamName}</p>
                              </div>
                            ) : isPastNoPicks ? (
                              <p className="text-muted-foreground italic">No picks submitted</p>
                            ) : (
                              <p className="text-muted-foreground italic">Not selected yet</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isFuture && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Lock className="w-4 h-4" />
                              <span>Locked</span>
                            </div>
                          )}
                          {isOpen && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* RB Section */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <RBIcon className="text-primary" />
                      Running Back
                    </h3>
                    <Card
                      className={cn(
                        "transition-all border-border",
                        isOpen && "cursor-pointer hover:bg-muted/10 hover:border-primary/50",
                        (isFuture || isPastNoPicks) && "opacity-60"
                      )}
                      onClick={() => isOpen && handleOpenSheet(weekNum, "RB", "Running Back")}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {weekPicks.rb && (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-foreground/80 flex items-center justify-center text-xs font-semibold shrink-0 text-background">
                              {weekPicks.rb.imageUrl ? (
                                <img src={weekPicks.rb.imageUrl} alt={weekPicks.rb.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{getPlayerInitials(weekPicks.rb.name)}</span>
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">RB</p>
                            {weekPicks.rb ? (
                              <div>
                                <p className="font-semibold">{weekPicks.rb.name}</p>
                                <p className="text-sm text-muted-foreground">{weekPicks.rb.teamName}</p>
                              </div>
                            ) : isPastNoPicks ? (
                              <p className="text-muted-foreground italic">No picks submitted</p>
                            ) : (
                              <p className="text-muted-foreground italic">Not selected yet</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isFuture && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Lock className="w-4 h-4" />
                              <span>Locked</span>
                            </div>
                          )}
                          {isOpen && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* FLEX Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <FlexIcon className="text-primary" />
                      Flex (WR/TE)
                    </h3>
                    <Card
                      className={cn(
                        "transition-all border-border",
                        isOpen && "cursor-pointer hover:bg-muted/10 hover:border-primary/50",
                        (isFuture || isPastNoPicks) && "opacity-60"
                      )}
                      onClick={() => isOpen && handleOpenSheet(weekNum, "FLEX", "Flex (WR/TE)")}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {weekPicks.flex && (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-foreground/80 flex items-center justify-center text-xs font-semibold shrink-0 text-background">
                              {weekPicks.flex.imageUrl ? (
                                <img src={weekPicks.flex.imageUrl} alt={weekPicks.flex.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{getPlayerInitials(weekPicks.flex.name)}</span>
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">FLEX</p>
                            {weekPicks.flex ? (
                              <div>
                                <p className="font-semibold">{weekPicks.flex.name}</p>
                                <p className="text-sm text-muted-foreground">{weekPicks.flex.teamName}</p>
                              </div>
                            ) : isPastNoPicks ? (
                              <p className="text-muted-foreground italic">No picks submitted</p>
                            ) : (
                              <p className="text-muted-foreground italic">Not selected yet</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isFuture && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Lock className="w-4 h-4" />
                              <span>Locked</span>
                            </div>
                          )}
                          {isOpen && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary and Submit Section */}
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>Your picks for {weekLabel}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                          <span className="font-medium">QB:</span>
                          <span className="text-muted-foreground">
                            {weekPicks.qb ? `${weekPicks.qb.name} (${weekPicks.qb.teamAbbr})` : "Not selected yet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                          <span className="font-medium">RB:</span>
                          <span className="text-muted-foreground">
                            {weekPicks.rb ? `${weekPicks.rb.name} (${weekPicks.rb.teamAbbr})` : "Not selected yet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                          <span className="font-medium">FLEX:</span>
                          <span className="text-muted-foreground">
                            {weekPicks.flex ? `${weekPicks.flex.name} (${weekPicks.flex.teamAbbr})` : "Not selected yet"}
                          </span>
                        </div>
                      </div>

                      {isOpen && (
                        <>
                          <Button
                            onClick={() => handleSubmitClick(weekNum)}
                            disabled={!allSlotsSelected}
                            className="w-full"
                            size="lg"
                          >
                            Submit picks for {weekLabel}
                          </Button>
                          <p className="text-sm text-muted-foreground text-center">
                            Once you submit picks for this week, they can't be changed.
                          </p>
                        </>
                      )}

                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        Your picks are private until everyone in your league has submitted or the first game kicks off.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>

      {/* Player Selection Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex flex-col h-[90vh] bg-card border-t border-border rounded-t-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle className="text-foreground">
              {sheetConfig && `Select a ${sheetConfig.label} for ${getDisplayWeekLabel(sheetConfig.weekNumber)}`}
            </SheetTitle>
          </SheetHeader>

          {/* Sticky search bar */}
          <div className="sticky top-0 bg-card pb-2 z-10 mt-4">
            <Input
              placeholder="Search by player or team…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border-border"
              autoFocus={false}
              autoComplete="off"
            />
          </div>

          {/* Scrollable player list */}
          <div className="overflow-y-auto max-h-[65vh] pb-4">
            <div className="space-y-2 pr-2">
              {getFilteredPlayers().map((player) => {
                const colors = teamColorMap[player.teamAbbr] ?? teamColorMap.DEFAULT;
                const alreadyPickedIds = sheetConfig ? getAlreadyPickedPlayerIds(sheetConfig.weekNumber) : new Set();
                const isAlreadyPicked = alreadyPickedIds.has(player.playerId);
                
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "rounded-xl border border-border bg-card transition",
                      isAlreadyPicked 
                        ? "opacity-40 cursor-not-allowed" 
                        : "cursor-pointer hover:bg-muted/20 hover:border-primary/30"
                    )}
                    onClick={() => !isAlreadyPicked && handleSelectPlayer(player)}
                  >
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar with fallback */}
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-foreground/80 flex items-center justify-center text-xs font-semibold shrink-0 text-background">
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getPlayerInitials(player.name)}</span>
                          )}
                        </div>
                        
                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-foreground">{player.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={cn("text-xs", getPositionColor(player.position))}>
                              {player.position}
                            </Badge>
                            {isAlreadyPicked && (
                              <Badge variant="secondary" className="text-xs">
                                Already picked
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Team pill with soft colors */}
                      <span 
                        className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 opacity-90"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {player.teamAbbr}
                      </span>
                    </div>
                  </div>
                );
              })}

              {getFilteredPlayers().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No players found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Submit picks for {weekToSubmit !== null ? getDisplayWeekLabel(weekToSubmit) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your picks for {weekToSubmit !== null ? getDisplayWeekLabel(weekToSubmit) : "this week"}?
              This action cannot be changed once submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {weekToSubmit !== null && (
            <div className="mt-4 space-y-1 text-sm">
              <div>
                <span className="font-medium">QB:</span>{" "}
                {picksByWeek[weekToSubmit]?.qb ? (
                  <>
                    {picksByWeek[weekToSubmit].qb!.name} – {picksByWeek[weekToSubmit].qb!.teamName}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
              <div>
                <span className="font-medium">RB:</span>{" "}
                {picksByWeek[weekToSubmit]?.rb ? (
                  <>
                    {picksByWeek[weekToSubmit].rb!.name} – {picksByWeek[weekToSubmit].rb!.teamName}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
              <div>
                <span className="font-medium">FLEX:</span>{" "}
                {picksByWeek[weekToSubmit]?.flex ? (
                  <>
                    {picksByWeek[weekToSubmit].flex!.name} – {picksByWeek[weekToSubmit].flex!.teamName}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Yes, submit my picks"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset picks for {weekToReset !== null ? getDisplayWeekLabel(weekToReset) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your picks for {weekToReset !== null ? getDisplayWeekLabel(weekToReset) : "this week"}? 
              This only affects your account and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReset} 
              disabled={isResetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Yes, clear my picks"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Picks;

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
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
import { playoffWeeks } from "@/data/playoffWeeks";
import { getWeekStatus, getCurrentOpenWeek } from "@/lib/weekStatus";
import { format } from "date-fns";
import { Pick } from "@/domain/types";
import { supabase } from "@/integrations/supabase/client";
import { getWeekLabel, getWeekShortLabel } from "@/data/weekLabels";

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

type WeekPicks = {
  qb?: PlayoffPlayer;
  rb?: PlayoffPlayer;
  flex?: PlayoffPlayer;
  submitted: boolean;
  submittedAt?: string;
};

// Hard-coded for testing
const CURRENT_SEASON = 2024;
const CURRENT_WEEK = 1;
const currentUserId = "ben";
const currentLeagueId = "playoff-league-2024";

// Debug time override - set to true to test Week 1 as open
const USE_DEBUG_TIME = true;
const DEBUG_NOW = new Date("2025-01-10T12:00:00-05:00");

const Picks = () => {
  const CURRENT_TIME = USE_DEBUG_TIME ? DEBUG_NOW : new Date();
  const currentOpenWeek = getCurrentOpenWeek(playoffWeeks, CURRENT_TIME);
  const initialWeek = currentOpenWeek?.weekNumber.toString() ?? "1";

  const [activeWeek, setActiveWeek] = useState<string>(initialWeek);
  const [picksByWeek, setPicksByWeek] = useState<Record<number, WeekPicks>>({
    1: { submitted: false },
    2: { submitted: false },
    3: { submitted: false },
    4: { submitted: false },
  });

  // Players from Supabase
  const [allPlayers, setAllPlayers] = useState<PlayoffPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

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

  // Fetch players from playoff_players table
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      const { data, error } = await supabase
        .from("playoff_players")
        .select("*")
        .eq("season", CURRENT_SEASON)
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
        setAllPlayers(data || []);
      }
      setLoadingPlayers(false);
    };

    fetchPlayers();
  }, []);

  // Fetch existing picks for the user
  useEffect(() => {
    const fetchUserPicks = async () => {
      const { data, error } = await supabase
        .from("user_picks")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("league_id", currentLeagueId)
        .eq("season", CURRENT_SEASON);

      if (error) {
        console.error("Error fetching user picks:", error);
        return;
      }

      if (data && data.length > 0) {
        // Group picks by week
        const picksByWeekMap: Record<number, WeekPicks> = {
          1: { submitted: false },
          2: { submitted: false },
          3: { submitted: false },
          4: { submitted: false },
        };

        data.forEach((pick) => {
          const week = pick.week;
          if (!picksByWeekMap[week]) {
            picksByWeekMap[week] = { submitted: false };
          }

          const player: PlayoffPlayer = {
            id: pick.id,
            player_id: pick.player_id,
            name: pick.player_name,
            position: pick.position,
            team_name: pick.team_name,
            team_id: pick.team_id,
            number: null,
            image_url: null,
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

        setPicksByWeek(picksByWeekMap);
      }
    };

    fetchUserPicks();
  }, []);

  const handleOpenSheet = (weekNumber: number, positionSlot: PositionSlot, label: string) => {
    setSheetConfig({ weekNumber, positionSlot, label });
    setSearchTerm("");
    setSheetOpen(true);
  };

  // Helper to get all player IDs picked in previous weeks by current user
  const getAlreadyPickedPlayerIds = (currentWeekNum: number): Set<number> => {
    const pickedIds = new Set<number>();
    // Only look at weeks BEFORE the current week
    for (let w = 1; w < currentWeekNum; w++) {
      const picks = picksByWeek[w];
      if (picks.qb) pickedIds.add(picks.qb.player_id);
      if (picks.rb) pickedIds.add(picks.rb.player_id);
      if (picks.flex) pickedIds.add(picks.flex.player_id);
    }
    return pickedIds;
  };

  const handleSelectPlayer = (player: PlayoffPlayer) => {
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

    if (!weekPicks.qb || !weekPicks.rb || !weekPicks.flex) {
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
    if (weekToSubmit === null) return;

    const weekPicks = picksByWeek[weekToSubmit];
    if (!weekPicks.qb || !weekPicks.rb || !weekPicks.flex) return;

    setIsSubmitting(true);

    try {
      // Prepare the picks to insert
      const picksToInsert = [
        {
          user_id: currentUserId,
          league_id: currentLeagueId,
          season: CURRENT_SEASON,
          week: weekToSubmit,
          position_slot: "QB",
          player_id: weekPicks.qb.player_id,
          player_name: weekPicks.qb.name,
          team_id: weekPicks.qb.team_id,
          team_name: weekPicks.qb.team_name,
          position: weekPicks.qb.position,
        },
        {
          user_id: currentUserId,
          league_id: currentLeagueId,
          season: CURRENT_SEASON,
          week: weekToSubmit,
          position_slot: "RB",
          player_id: weekPicks.rb.player_id,
          player_name: weekPicks.rb.name,
          team_id: weekPicks.rb.team_id,
          team_name: weekPicks.rb.team_name,
          position: weekPicks.rb.position,
        },
        {
          user_id: currentUserId,
          league_id: currentLeagueId,
          season: CURRENT_SEASON,
          week: weekToSubmit,
          position_slot: "FLEX",
          player_id: weekPicks.flex.player_id,
          player_name: weekPicks.flex.name,
          team_id: weekPicks.flex.team_id,
          team_name: weekPicks.flex.team_name,
          position: weekPicks.flex.position,
        },
      ];

      const { error } = await supabase
        .from("user_picks")
        .upsert(picksToInsert, {
          onConflict: "user_id,league_id,season,week,position_slot",
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

      toast({
        title: `${getWeekLabel(weekToSubmit)} picks submitted!`,
        description: "Your picks have been saved to the database and locked.",
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
    if (weekToReset === null) return;

    setIsResetting(true);

    try {
      const { error } = await supabase
        .from("user_picks")
        .delete()
        .eq("user_id", currentUserId)
        .eq("league_id", currentLeagueId)
        .eq("season", CURRENT_SEASON)
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

      toast({
        title: `${getWeekLabel(weekToReset)} picks cleared`,
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
  const getFilteredPlayers = (): PlayoffPlayer[] => {
    if (!sheetConfig) return [];

    const { weekNumber, positionSlot } = sheetConfig;

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
          p.name.toLowerCase().includes(searchLower) || p.team_name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by team_name then name
    return filtered.sort((a, b) => {
      const teamCompare = a.team_name.localeCompare(b.team_name);
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

  // Get team abbreviation for display
  const getTeamAbbrev = (teamName: string): string => {
    // Map full team names to abbreviations
    const abbrevMap: Record<string, string> = {
      "Baltimore Ravens": "BAL",
      "Buffalo Bills": "BUF",
      "Denver Broncos": "DEN",
      "Detroit Lions": "DET",
      "Green Bay Packers": "GB",
      "Houston Texans": "HOU",
      "Kansas City Chiefs": "KC",
      "Los Angeles Chargers": "LAC",
      "Los Angeles Rams": "LAR",
      "Minnesota Vikings": "MIN",
      "Philadelphia Eagles": "PHI",
      "Pittsburgh Steelers": "PIT",
      "Tampa Bay Buccaneers": "TB",
      "Washington Commanders": "WAS",
    };
    return abbrevMap[teamName] || teamName.substring(0, 3).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              EMMA
            </h1>
          </div>
          <p className="text-muted-foreground">
            Make Your Weekly Picks — Pick one QB, one RB, and one FLEX for each playoff week
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loadingPlayers ? (
          <div className="text-center py-12 text-muted-foreground">Loading players...</div>
        ) : (
          <Tabs value={activeWeek} onValueChange={(v) => setActiveWeek(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1 bg-muted/50 border border-border">
              {playoffWeeks.map((week) => {
                const weekNum = week.weekNumber;
                const weekPicks = picksByWeek[weekNum];
                
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

                return (
                  <TabsTrigger
                    key={week.id}
                    value={value}
                    disabled={isFuture}
                    className={cn(
                      "text-sm sm:text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                      isFuture && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      if (isFuture) {
                        e.preventDefault();
                        toast({
                          title: "Week not available",
                          description: `${getWeekLabel(week.weekNumber)} picks open on ${format(new Date(week.openAt), "PPP 'at' p")}`,
                        });
                        return;
                      }
                    }}
                  >
                    {getWeekShortLabel(week.weekNumber)}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {playoffWeeks.map((week) => {
              const weekNum = week.weekNumber;
              const weekPicks = picksByWeek[weekNum];
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

              return (
                <TabsContent key={week.id} value={weekNum.toString()} className="mt-0">
                  {/* Status Banner */}
                  <div className="mb-6">
                    {isFuture && (
                      <Alert className="mb-4 border-border bg-muted/20">
                        <Lock className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-1 text-foreground">{getWeekLabel(weekNum)} picks are not open yet.</div>
                          <div className="text-sm text-muted-foreground">{getWeekLabel(weekNum)} opens on {format(new Date(week.openAt), "PPPP 'at' p")}.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isOpen && (
                      <Alert className="mb-4 bg-primary/10 border-primary/30">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <div className="font-semibold mb-1 text-primary">Make your picks for {getWeekLabel(weekNum)}</div>
                          <div className="text-sm text-muted-foreground">Picks are due by {format(new Date(week.deadlineAt), "PPPP 'at' p")}.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isSubmittedState && (
                      <Alert className="mb-4 bg-primary/10 border-primary/30">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <div className="font-semibold mb-1 text-primary">Your picks for {getWeekLabel(weekNum)} have been submitted.</div>
                          <div className="text-sm text-muted-foreground">
                            Submitted on {weekPicks.submittedAt ? format(new Date(weekPicks.submittedAt), "PPP 'at' p") : "just now"}. You can't change picks after submitting.
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isPastNoPicks && (
                      <Alert className="mb-4 border-destructive/50 bg-destructive/10" variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-1">{getWeekLabel(weekNum)} is complete.</div>
                          <div className="text-sm">You didn't submit picks for this week.</div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">{getWeekLabel(weekNum)} Picks</h2>
                      {/* Admin reset button */}
                      {(weekPicks.qb || weekPicks.rb || weekPicks.flex || weekPicks.submitted) && (
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
                          Admin: Reset {getWeekShortLabel(weekNum)}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* QB Section */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <span className="inline-block w-1 h-5 bg-primary rounded"></span>
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
                              {weekPicks.qb.image_url ? (
                                <img src={weekPicks.qb.image_url} alt={weekPicks.qb.name} className="w-full h-full object-cover" />
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
                                <p className="text-sm text-muted-foreground">{weekPicks.qb.team_name}</p>
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
                      <span className="inline-block w-1 h-5 bg-primary rounded"></span>
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
                              {weekPicks.rb.image_url ? (
                                <img src={weekPicks.rb.image_url} alt={weekPicks.rb.name} className="w-full h-full object-cover" />
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
                                <p className="text-sm text-muted-foreground">{weekPicks.rb.team_name}</p>
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
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-block w-1 h-5 bg-green-500 rounded"></span>
                      Flex (WR/TE)
                    </h3>
                    <Card
                      className={cn(
                        "transition-all",
                        isOpen && "cursor-pointer hover:shadow-md hover:border-primary/50",
                        (isFuture || isPastNoPicks) && "opacity-60"
                      )}
                      onClick={() => isOpen && handleOpenSheet(weekNum, "FLEX", "Flex (WR/TE)")}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {weekPicks.flex && (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-foreground/80 flex items-center justify-center text-xs font-semibold shrink-0 text-background">
                              {weekPicks.flex.image_url ? (
                                <img src={weekPicks.flex.image_url} alt={weekPicks.flex.name} className="w-full h-full object-cover" />
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
                                <p className="text-sm text-muted-foreground">{weekPicks.flex.team_name}</p>
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
                      <CardTitle>Your picks for Week {weekNum}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                          <span className="font-medium">QB:</span>
                          <span className="text-muted-foreground">
                            {weekPicks.qb ? `${weekPicks.qb.name} (${getTeamAbbrev(weekPicks.qb.team_name)})` : "Not selected yet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                          <span className="font-medium">RB:</span>
                          <span className="text-muted-foreground">
                            {weekPicks.rb ? `${weekPicks.rb.name} (${getTeamAbbrev(weekPicks.rb.team_name)})` : "Not selected yet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                          <span className="font-medium">FLEX:</span>
                          <span className="text-muted-foreground">
                            {weekPicks.flex ? `${weekPicks.flex.name} (${getTeamAbbrev(weekPicks.flex.team_name)})` : "Not selected yet"}
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
                            Submit picks for Week {weekNum}
                          </Button>
                          <p className="text-sm text-muted-foreground text-center">
                            Once you submit picks for this week, they can't be changed.
                          </p>
                        </>
                      )}

                      <Alert className="bg-muted/20 border-border">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <AlertDescription className="text-sm text-muted-foreground">
                          Your picks are private to you until either:
                          <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                            <li>Everyone in your league has submitted, or</li>
                            <li>The first game of the week kicks off</li>
                          </ul>
                          After that, all league members will be able to see everyone's picks.
                        </AlertDescription>
                      </Alert>
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
        <SheetContent side="bottom" className="flex flex-col max-h-[80vh] bg-card border-t border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">
              {sheetConfig && `Select a ${sheetConfig.label} for Week ${sheetConfig.weekNumber}`}
            </SheetTitle>
          </SheetHeader>

          {/* Sticky search bar */}
          <div className="sticky top-0 bg-card pb-2 z-10 mt-4">
            <Input
              placeholder="Search by player or team…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border-border"
            />
          </div>

          {/* Scrollable player list */}
          <div className="overflow-y-auto max-h-[65vh] pb-4">
            <div className="space-y-2 pr-2">
              {getFilteredPlayers().map((player) => {
                const teamAbbrev = getTeamAbbrev(player.team_name);
                const colors = teamColorMap[teamAbbrev] ?? teamColorMap.DEFAULT;
                const alreadyPickedIds = sheetConfig ? getAlreadyPickedPlayerIds(sheetConfig.weekNumber) : new Set();
                const isAlreadyPicked = alreadyPickedIds.has(player.player_id);
                
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
                          {player.image_url ? (
                            <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
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
                        {teamAbbrev}
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
              Submit picks for {weekToSubmit !== null ? getWeekLabel(weekToSubmit) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your picks for {weekToSubmit !== null ? getWeekLabel(weekToSubmit) : "this week"}?
              This action cannot be changed once submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {weekToSubmit !== null && (
            <div className="mt-4 space-y-1 text-sm">
              <div>
                <span className="font-medium">QB:</span>{" "}
                {picksByWeek[weekToSubmit]?.qb ? (
                  <>
                    {picksByWeek[weekToSubmit].qb!.name} – {picksByWeek[weekToSubmit].qb!.team_name}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
              <div>
                <span className="font-medium">RB:</span>{" "}
                {picksByWeek[weekToSubmit]?.rb ? (
                  <>
                    {picksByWeek[weekToSubmit].rb!.name} – {picksByWeek[weekToSubmit].rb!.team_name}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
              <div>
                <span className="font-medium">FLEX:</span>{" "}
                {picksByWeek[weekToSubmit]?.flex ? (
                  <>
                    {picksByWeek[weekToSubmit].flex!.name} – {picksByWeek[weekToSubmit].flex!.team_name}
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
              Reset picks for {weekToReset !== null ? getWeekLabel(weekToReset) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your picks for {weekToReset !== null ? getWeekLabel(weekToReset) : "this week"}? 
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

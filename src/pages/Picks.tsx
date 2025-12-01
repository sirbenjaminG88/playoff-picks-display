import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { availablePlayersByWeek, AvailablePlayer } from "@/data/availablePlayersByWeek";
import { ClipboardList, CheckCircle2, Info, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { teamColorMap } from "@/lib/teamColors";
import { playoffWeeks } from "@/data/playoffWeeks";
import { getWeekStatus, getCurrentOpenWeek } from "@/lib/weekStatus";
import { format } from "date-fns";
import { Pick } from "@/domain/types";

type PositionSlot = "QB" | "RB" | "FLEX";

type WeekPicks = {
  qb?: AvailablePlayer;
  rb?: AvailablePlayer;
  flex?: AvailablePlayer;
  submitted: boolean;
  submittedAt?: string;
};

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

  const handleOpenSheet = (weekNumber: number, positionSlot: PositionSlot, label: string) => {
    setSheetConfig({ weekNumber, positionSlot, label });
    setSearchTerm("");
    setSheetOpen(true);
  };

  // Helper to get all player IDs picked in previous weeks by current user
  const getAlreadyPickedPlayerIds = (currentWeekNum: number): Set<string> => {
    const pickedIds = new Set<string>();
    // Only look at weeks BEFORE the current week
    for (let w = 1; w < currentWeekNum; w++) {
      const picks = picksByWeek[w];
      if (picks.qb) pickedIds.add(picks.qb.id);
      if (picks.rb) pickedIds.add(picks.rb.id);
      if (picks.flex) pickedIds.add(picks.flex.id);
    }
    return pickedIds;
  };

  const handleSelectPlayer = (player: AvailablePlayer) => {
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

  const handleConfirmSubmit = () => {
    if (weekToSubmit === null) return;

    setPicksByWeek((prev) => ({
      ...prev,
      [weekToSubmit]: {
        ...prev[weekToSubmit],
        submitted: true,
        submittedAt: new Date().toISOString(),
      },
    }));

    toast({
      title: `Week ${weekToSubmit} picks submitted!`,
      description: "Your picks have been locked and cannot be changed.",
    });

    setShowConfirmDialog(false);
    setWeekToSubmit(null);
  };

  // Filter players for the sheet
  const getFilteredPlayers = (): AvailablePlayer[] => {
    if (!sheetConfig) return [];

    const { weekNumber, positionSlot } = sheetConfig;
    const allPlayers = availablePlayersByWeek[weekNumber] || [];

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
          p.name.toLowerCase().includes(searchLower) || p.team.toLowerCase().includes(searchLower)
      );
    }

    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
        <Tabs value={activeWeek} onValueChange={(v) => setActiveWeek(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1">
            {playoffWeeks.map((week) => {
              const weekNum = week.weekNumber;
              const weekPicks = picksByWeek[weekNum];
              
              // Convert local picks to Pick[] format for status check
              const userPicksForWeek: Pick[] = [];
              if (weekPicks.submitted) {
                // Create mock Pick objects (in real app, these would be actual Pick records)
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
                        description: `Week ${week.weekNumber} picks open on ${format(new Date(week.openAt), "PPP 'at' p")}`,
                      });
                      return;
                    }
                  }}
                >
                  Week {week.weekNumber}
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
                    <Alert className="mb-4">
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-1">Week {weekNum} picks are not open yet.</div>
                        <div className="text-sm">Week {weekNum} opens on {format(new Date(week.openAt), "PPPP 'at' p")}.</div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isOpen && (
                    <Alert className="mb-4 bg-primary/5 border-primary/20">
                      <Info className="h-4 w-4 text-primary" />
                      <AlertDescription>
                        <div className="font-semibold mb-1 text-primary">Make your picks for Week {weekNum}</div>
                        <div className="text-sm text-muted-foreground">Picks are due by {format(new Date(week.deadlineAt), "PPPP 'at' p")}.</div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isSubmittedState && (
                    <Alert className="mb-4 bg-primary/5 border-primary/20">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <AlertDescription>
                        <div className="font-semibold mb-1 text-primary">Your picks for Week {weekNum} have been submitted.</div>
                        <div className="text-sm text-muted-foreground">
                          Submitted on {weekPicks.submittedAt ? format(new Date(weekPicks.submittedAt), "PPP 'at' p") : "just now"}. You can't change picks after submitting.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isPastNoPicks && (
                    <Alert className="mb-4" variant="destructive">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-1">Week {weekNum} is complete.</div>
                        <div className="text-sm">You didn't submit picks for this week.</div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <h2 className="text-2xl font-bold">Week {weekNum} Picks</h2>
                </div>

                {/* QB Section */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="inline-block w-1 h-5 bg-red-500 rounded"></span>
                    Quarterback
                  </h3>
                  <Card
                    className={cn(
                      "transition-all",
                      isOpen && "cursor-pointer hover:shadow-md hover:border-primary/50",
                      (isFuture || isPastNoPicks) && "opacity-60"
                    )}
                    onClick={() => isOpen && handleOpenSheet(weekNum, "QB", "Quarterback")}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">QB</p>
                          {weekPicks.qb ? (
                            <div>
                              <p className="font-semibold">{weekPicks.qb.name}</p>
                              <p className="text-sm text-muted-foreground">{weekPicks.qb.team}</p>
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
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="inline-block w-1 h-5 bg-blue-500 rounded"></span>
                    Running Back
                  </h3>
                  <Card
                    className={cn(
                      "transition-all",
                      isOpen && "cursor-pointer hover:shadow-md hover:border-primary/50",
                      (isFuture || isPastNoPicks) && "opacity-60"
                    )}
                    onClick={() => isOpen && handleOpenSheet(weekNum, "RB", "Running Back")}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">RB</p>
                          {weekPicks.rb ? (
                            <div>
                              <p className="font-semibold">{weekPicks.rb.name}</p>
                              <p className="text-sm text-muted-foreground">{weekPicks.rb.team}</p>
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
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">FLEX</p>
                          {weekPicks.flex ? (
                            <div>
                              <p className="font-semibold">{weekPicks.flex.name}</p>
                              <p className="text-sm text-muted-foreground">{weekPicks.flex.team}</p>
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
                          {weekPicks.qb ? `${weekPicks.qb.name} (${weekPicks.qb.team})` : "Not selected yet"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                        <span className="font-medium">RB:</span>
                        <span className="text-muted-foreground">
                          {weekPicks.rb ? `${weekPicks.rb.name} (${weekPicks.rb.team})` : "Not selected yet"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                        <span className="font-medium">FLEX:</span>
                        <span className="text-muted-foreground">
                          {weekPicks.flex ? `${weekPicks.flex.name} (${weekPicks.flex.team})` : "Not selected yet"}
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

                    <Alert className="bg-muted/30">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
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
      </main>

      {/* Player Selection Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="flex flex-col max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>
              {sheetConfig && `Select a ${sheetConfig.label} for Week ${sheetConfig.weekNumber}`}
            </SheetTitle>
          </SheetHeader>

          {/* Sticky search bar */}
          <div className="sticky top-0 bg-background pb-2 z-10 mt-4">
            <Input
              placeholder="Search by player or team…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Scrollable player list */}
          <div className="overflow-y-auto max-h-[65vh] pb-4">
            <div className="space-y-2 pr-2">
              {getFilteredPlayers().map((player) => {
                const colors = teamColorMap[player.team] ?? teamColorMap.DEFAULT;
                const alreadyPickedIds = sheetConfig ? getAlreadyPickedPlayerIds(sheetConfig.weekNumber) : new Set();
                const isReallyAlreadyPicked = alreadyPickedIds.has(player.id);
                // Compute display flag: true if EITHER real logic OR test flag is true
                const displayIsAlreadyPicked = isReallyAlreadyPicked || player.isTestAlreadyPicked === true;
                
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "rounded-xl border bg-card transition",
                      displayIsAlreadyPicked 
                        ? "opacity-50 cursor-not-allowed" 
                        : "cursor-pointer hover:shadow-sm hover:bg-muted/60"
                    )}
                    onClick={() => !displayIsAlreadyPicked && handleSelectPlayer(player)}
                  >
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar with fallback */}
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getPlayerInitials(player.name)}</span>
                          )}
                        </div>
                        
                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{player.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={cn("text-xs", getPositionColor(player.position))}>
                              {player.position}
                            </Badge>
                            {displayIsAlreadyPicked && (
                              <Badge variant="secondary" className="text-xs">
                                Already picked
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Team pill with soft colors */}
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {player.team}
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
              Submit picks for Week {weekToSubmit}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your picks for Week {weekToSubmit}?
              This action cannot be changed once submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {weekToSubmit !== null && (
            <div className="mt-4 space-y-1 text-sm">
              <div>
                <span className="font-medium">QB:</span>{" "}
                {picksByWeek[weekToSubmit]?.qb ? (
                  <>
                    {picksByWeek[weekToSubmit].qb!.name} – {picksByWeek[weekToSubmit].qb!.team}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
              <div>
                <span className="font-medium">RB:</span>{" "}
                {picksByWeek[weekToSubmit]?.rb ? (
                  <>
                    {picksByWeek[weekToSubmit].rb!.name} – {picksByWeek[weekToSubmit].rb!.team}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
              <div>
                <span className="font-medium">FLEX:</span>{" "}
                {picksByWeek[weekToSubmit]?.flex ? (
                  <>
                    {picksByWeek[weekToSubmit].flex!.name} – {picksByWeek[weekToSubmit].flex!.team}
                  </>
                ) : (
                  "Not selected"
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Yes, submit my picks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Picks;

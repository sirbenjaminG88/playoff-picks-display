import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { playoffResultsByWeek } from "@/data/playoffResultsData";
import { ClipboardList, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type PositionSlot = "QB" | "RB" | "FLEX";

type WeekPicks = {
  QB?: string;
  RB?: string;
  FLEX?: string;
};

type AvailablePlayer = {
  id: string;
  name: string;
  team: string;
  position: "QB" | "RB" | "WR" | "TE";
};

const currentUserId = "ben";
const currentLeagueId = "playoff-league-2024";

const Picks = () => {
  const [activeWeek, setActiveWeek] = useState("1");
  const [picksByWeek, setPicksByWeek] = useState<Record<string, WeekPicks>>({});
  const [submittedWeeks, setSubmittedWeeks] = useState<Set<string>>(new Set());

  const handlePlayerSelect = (weekKey: string, slot: PositionSlot, playerId: string) => {
    setPicksByWeek((prev) => {
      const existing = prev[weekKey] ?? {};
      return {
        ...prev,
        [weekKey]: {
          ...existing,
          [slot]: playerId,
        },
      };
    });
  };

  const handleSubmit = (weekKey: string) => {
    setSubmittedWeeks((prev) => new Set(prev).add(weekKey));
  };

  const getAvailablePlayers = (weekNum: number, slot: PositionSlot): AvailablePlayer[] => {
    const weekKey = `week${weekNum}` as keyof typeof playoffResultsByWeek;
    const weekData = playoffResultsByWeek[weekKey];

    if (slot === "QB") {
      return weekData.qbs.map((p) => ({
        id: `${p.name}-${p.team}`,
        name: p.name,
        team: p.team,
        position: p.position,
      }));
    } else if (slot === "RB") {
      return weekData.rbs.map((p) => ({
        id: `${p.name}-${p.team}`,
        name: p.name,
        team: p.team,
        position: p.position,
      }));
    } else {
      return weekData.flex.map((p) => ({
        id: `${p.name}-${p.team}`,
        name: p.name,
        team: p.team,
        position: p.position,
      }));
    }
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
        <Tabs value={activeWeek} onValueChange={setActiveWeek} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1">
            {[1, 2, 3, 4].map((weekNum) => (
              <TabsTrigger
                key={weekNum}
                value={weekNum.toString()}
                className="text-sm sm:text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Week {weekNum}
              </TabsTrigger>
            ))}
          </TabsList>

          {[1, 2, 3, 4].map((weekNum) => {
            const weekKey = `week${weekNum}`;
            const weekPicks = picksByWeek[weekKey] ?? {};
            const isSubmitted = submittedWeeks.has(weekKey);
            const allSlotsSelected = weekPicks.QB && weekPicks.RB && weekPicks.FLEX;

            return (
              <TabsContent key={weekNum} value={weekNum.toString()} className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Week {weekNum} Picks</h2>
                  <p className="text-muted-foreground">
                    {isSubmitted
                      ? "Your picks have been submitted and locked."
                      : "Select one player for each position to complete your picks."}
                  </p>
                </div>

                {/* QB Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-red-500 rounded"></span>
                    Quarterback
                  </h3>
                  <div
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                      isSubmitted && "opacity-60 pointer-events-none"
                    )}
                  >
                    {getAvailablePlayers(weekNum, "QB").map((player) => {
                      const isSelected = weekPicks.QB === player.id;
                      return (
                        <Card
                          key={player.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            isSelected && "ring-2 ring-primary bg-primary/5"
                          )}
                          onClick={() => !isSubmitted && handlePlayerSelect(weekKey, "QB", player.id)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{player.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <span className="font-medium">{player.team}</span>
                              <Badge className={cn("text-xs", getPositionColor(player.position))}>
                                {player.position}
                              </Badge>
                            </CardDescription>
                          </CardHeader>
                          {isSelected && (
                            <CardContent className="pt-0">
                              <div className="flex items-center gap-2 text-sm text-primary">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Selected</span>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* RB Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-blue-500 rounded"></span>
                    Running Back
                  </h3>
                  <div
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                      isSubmitted && "opacity-60 pointer-events-none"
                    )}
                  >
                    {getAvailablePlayers(weekNum, "RB").map((player) => {
                      const isSelected = weekPicks.RB === player.id;
                      return (
                        <Card
                          key={player.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            isSelected && "ring-2 ring-primary bg-primary/5"
                          )}
                          onClick={() => !isSubmitted && handlePlayerSelect(weekKey, "RB", player.id)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{player.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <span className="font-medium">{player.team}</span>
                              <Badge className={cn("text-xs", getPositionColor(player.position))}>
                                {player.position}
                              </Badge>
                            </CardDescription>
                          </CardHeader>
                          {isSelected && (
                            <CardContent className="pt-0">
                              <div className="flex items-center gap-2 text-sm text-primary">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Selected</span>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* FLEX Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-green-500 rounded"></span>
                    Flex (WR/TE)
                  </h3>
                  <div
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                      isSubmitted && "opacity-60 pointer-events-none"
                    )}
                  >
                    {getAvailablePlayers(weekNum, "FLEX").map((player) => {
                      const isSelected = weekPicks.FLEX === player.id;
                      return (
                        <Card
                          key={player.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            isSelected && "ring-2 ring-primary bg-primary/5"
                          )}
                          onClick={() => !isSubmitted && handlePlayerSelect(weekKey, "FLEX", player.id)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{player.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <span className="font-medium">{player.team}</span>
                              <Badge className={cn("text-xs", getPositionColor(player.position))}>
                                {player.position}
                              </Badge>
                            </CardDescription>
                          </CardHeader>
                          {isSelected && (
                            <CardContent className="pt-0">
                              <div className="flex items-center gap-2 text-sm text-primary">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Selected</span>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
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
                          {weekPicks.QB
                            ? getAvailablePlayers(weekNum, "QB").find((p) => p.id === weekPicks.QB)?.name
                            : "Not selected yet"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                        <span className="font-medium">RB:</span>
                        <span className="text-muted-foreground">
                          {weekPicks.RB
                            ? getAvailablePlayers(weekNum, "RB").find((p) => p.id === weekPicks.RB)?.name
                            : "Not selected yet"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 rounded bg-muted/50">
                        <span className="font-medium">FLEX:</span>
                        <span className="text-muted-foreground">
                          {weekPicks.FLEX
                            ? getAvailablePlayers(weekNum, "FLEX").find((p) => p.id === weekPicks.FLEX)?.name
                            : "Not selected yet"}
                        </span>
                      </div>
                    </div>

                    {isSubmitted ? (
                      <Alert className="bg-primary/5 border-primary/20">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-primary">
                          ✅ Picks submitted and locked. You can no longer change Week {weekNum} picks.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Button
                        onClick={() => handleSubmit(weekKey)}
                        disabled={!allSlotsSelected}
                        className="w-full"
                        size="lg"
                      >
                        Submit picks for Week {weekNum}
                      </Button>
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
    </div>
  );
};

export default Picks;

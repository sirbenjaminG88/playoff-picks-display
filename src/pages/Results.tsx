import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { mockStandingsData, mockWeekResults, PlayerResult } from "@/data/mockStandingsData";
import { teamColorMap } from "@/lib/teamColors";

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const PlayerCard = ({ player }: { player: PlayerResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isPopular = player.selectedBy.length > 1;
  const isUnique = player.selectedBy.length === 1;
  const teamColors = teamColorMap[player.team] ?? teamColorMap.DEFAULT;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden border-border">
        <CollapsibleTrigger className="w-full">
          <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            {/* Header: Avatar + Player Info + Chevron */}
            <div className="flex items-start gap-3 mb-3">
              {/* Player Avatar */}
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarFallback className="bg-foreground/80 text-background font-semibold text-sm">
                  {getInitials(player.name)}
                </AvatarFallback>
              </Avatar>

              {/* Player Info Stack */}
              <div className="flex-1 min-w-0">
                {/* Line 1: Name + Team Badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold text-lg leading-tight text-foreground">{player.name}</h3>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs font-semibold ml-auto opacity-90"
                    style={{ backgroundColor: teamColors.bg, color: teamColors.text }}
                  >
                    {player.team}
                  </span>
                </div>

                {/* Line 2: Points Badge + Popular/Unique Tag */}
                <div className="flex items-center gap-2">
                  <Badge className="text-sm font-bold bg-primary text-primary-foreground">
                    {player.points.toFixed(1)} pts
                  </Badge>
                  {isPopular && (
                    <Badge variant="popular" className="text-xs">
                      Popular
                    </Badge>
                  )}
                  {isUnique && (
                    <Badge variant="secondary" className="text-xs">
                      Unique
                    </Badge>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Picked By Row */}
            <div className="flex items-center gap-2 ml-[60px] mt-3">
              <div className="flex -space-x-2">
                {player.selectedBy.map((userName) => (
                  <Avatar key={userName} className="h-6 w-6 border-2 border-card">
                    <AvatarFallback className="bg-foreground/80 text-background text-[10px] font-medium">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {player.selectedBy.join(", ")}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Stats Section - Separated from Header */}
          <div className="px-4 pb-4">
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Week Stats Breakdown</h4>
              <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {player.stats.passYards !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pass Yards:</span>
                        <span className="font-semibold text-foreground">{player.stats.passYards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pass TDs:</span>
                        <span className="font-semibold text-foreground">{player.stats.passTDs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interceptions:</span>
                        <span className="font-semibold text-foreground">{player.stats.interceptions}</span>
                      </div>
                    </>
                  )}
                  {player.stats.rushYards !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rush Yards:</span>
                        <span className="font-semibold text-foreground">{player.stats.rushYards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rush TDs:</span>
                        <span className="font-semibold text-foreground">{player.stats.rushTDs}</span>
                      </div>
                    </>
                  )}
                  {player.stats.recYards !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rec Yards:</span>
                        <span className="font-semibold text-foreground">{player.stats.recYards}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rec TDs:</span>
                        <span className="font-semibold text-foreground">{player.stats.recTDs}</span>
                      </div>
                    </>
                  )}
                  {player.stats.fumblesLost !== undefined && player.stats.fumblesLost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fumbles Lost:</span>
                      <span className="font-semibold text-foreground">{player.stats.fumblesLost}</span>
                    </div>
                  )}
                  {player.stats.twoPtConversions !== undefined && player.stats.twoPtConversions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">2PT Conversions:</span>
                      <span className="font-semibold text-foreground">{player.stats.twoPtConversions}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default function Results() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [leaderboardTab, setLeaderboardTab] = useState<"weekly" | "overall">("weekly");

  const currentWeekResults = mockWeekResults.find((w) => w.weekNumber === activeWeek);
  
  // Weekly leaderboard - just this week's points
  const weeklyLeaderboard = mockStandingsData
    .find((w) => w.weekNumber === activeWeek)
    ?.picks.sort((a, b) => b.weekPoints - a.weekPoints) || [];
  
  // Calculate overall standings by summing all weeks up to and including current
  const overallStandings = mockStandingsData
    .slice(0, activeWeek)
    .reduce((acc, week) => {
      week.picks.forEach((pick) => {
        const existing = acc.find((item) => item.userId === pick.userId);
        if (existing) {
          existing.totalPoints += pick.weekPoints;
        } else {
          acc.push({
            userId: pick.userId,
            userName: pick.userName,
            totalPoints: pick.weekPoints,
          });
        }
      });
      return acc;
    }, [] as { userId: string; userName: string; totalPoints: number }[])
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const leaderPoints = overallStandings[0]?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Results</h1>
          <p className="text-muted-foreground">Weekly scores and overall standings</p>
        </div>

        {/* Week Tabs */}
        <Tabs value={`week-${activeWeek}`} onValueChange={(v) => setActiveWeek(Number(v.split("-")[1]))}>
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 border border-border">
            <TabsTrigger value="week-1">Week 1</TabsTrigger>
            <TabsTrigger value="week-2">Week 2</TabsTrigger>
            <TabsTrigger value="week-3">Week 3</TabsTrigger>
            <TabsTrigger value="week-4">Week 4</TabsTrigger>
          </TabsList>

          {[1, 2, 3, 4].map((weekNum) => {
            const weekResults = mockWeekResults.find((w) => w.weekNumber === weekNum);
            
            return (
              <TabsContent key={weekNum} value={`week-${weekNum}`} className="space-y-6">
                {!weekResults ? (
                  <Card className="border-border">
                    <CardContent className="py-8">
                      <p className="text-muted-foreground text-center">
                        No results available for Week {weekNum} yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Quarterbacks Section */}
                    <div className="space-y-3">
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <span className="inline-block w-1 h-6 bg-primary rounded"></span>
                        Quarterbacks
                      </h2>
                      <div className="space-y-3">
                        {weekResults.qbs
                          .sort((a, b) => b.points - a.points)
                          .map((player) => (
                            <PlayerCard key={player.name} player={player} />
                          ))}
                      </div>
                    </div>

                    {/* Running Backs Section */}
                    <div className="space-y-3">
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <span className="inline-block w-1 h-6 bg-primary rounded"></span>
                        Running Backs
                      </h2>
                      <div className="space-y-3">
                        {weekResults.rbs
                          .sort((a, b) => b.points - a.points)
                          .map((player) => (
                            <PlayerCard key={player.name} player={player} />
                          ))}
                      </div>
                    </div>

                    {/* Flex Section */}
                    <div className="space-y-3">
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <span className="inline-block w-1 h-6 bg-primary rounded"></span>
                        Flex (WR/TE/RB)
                      </h2>
                      <div className="space-y-3">
                        {weekResults.flex
                          .sort((a, b) => b.points - a.points)
                          .map((player) => (
                            <PlayerCard key={player.name} player={player} />
                          ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Leaderboards Section */}
                <div className="mt-8">
                  <Tabs value={leaderboardTab} onValueChange={(v) => setLeaderboardTab(v as "weekly" | "overall")}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 border border-border p-1">
                      <TabsTrigger 
                        value="weekly"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Week {weekNum} Leaderboard
                      </TabsTrigger>
                      <TabsTrigger 
                        value="overall"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Overall Leaderboard
                      </TabsTrigger>
                    </TabsList>

                    {/* Weekly Leaderboard */}
                    <TabsContent value="weekly" className="mt-0">
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-foreground text-xl">Week {weekNum} Standings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {weeklyLeaderboard.length === 0 ? (
                            <div className="py-8 text-center">
                              <p className="text-muted-foreground">
                                No picks submitted for Week {weekNum}
                              </p>
                            </div>
                          ) : (
                            weeklyLeaderboard.map((pick, index) => (
                              <div
                                key={pick.userId}
                                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                              >
                                {/* Rank Badge */}
                                <Badge 
                                  variant="outline" 
                                  className="font-bold text-base border-border w-11 h-11 flex items-center justify-center shrink-0"
                                >
                                  #{index + 1}
                                </Badge>

                                {/* User Avatar */}
                                <Avatar className="h-11 w-11 shrink-0">
                                  <AvatarFallback className="bg-foreground/80 text-background font-semibold text-sm">
                                    {getInitials(pick.userName)}
                                  </AvatarFallback>
                                </Avatar>

                                {/* User Name */}
                                <span className="font-semibold text-lg text-foreground flex-1 min-w-0">
                                  {pick.userName}
                                </span>

                                {/* Points */}
                                <div className="flex flex-col items-end shrink-0">
                                  <Badge className="text-base font-bold bg-primary text-primary-foreground px-3 py-1">
                                    {pick.weekPoints.toFixed(1)} pts
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Overall Leaderboard */}
                    <TabsContent value="overall" className="mt-0">
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-foreground text-xl">Overall Standings (Through Week {weekNum})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {overallStandings.length === 0 ? (
                            <div className="py-8 text-center">
                              <p className="text-muted-foreground">
                                No standings available yet
                              </p>
                            </div>
                          ) : (
                            overallStandings.map((standing, index) => {
                              const pointsBehind = index > 0 ? leaderPoints - standing.totalPoints : 0;
                              
                              return (
                                <div
                                  key={standing.userId}
                                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                                >
                                  {/* Rank Badge */}
                                  <Badge 
                                    variant="outline" 
                                    className="font-bold text-base border-border w-11 h-11 flex items-center justify-center shrink-0"
                                  >
                                    #{index + 1}
                                  </Badge>

                                  {/* User Avatar */}
                                  <Avatar className="h-11 w-11 shrink-0">
                                    <AvatarFallback className="bg-foreground/80 text-background font-semibold text-sm">
                                      {getInitials(standing.userName)}
                                    </AvatarFallback>
                                  </Avatar>

                                  {/* User Name */}
                                  <span className="font-semibold text-lg text-foreground flex-1 min-w-0">
                                    {standing.userName}
                                  </span>

                                  {/* Points and Points Behind */}
                                  <div className="flex flex-col items-end shrink-0">
                                    <Badge className="text-base font-bold bg-primary text-primary-foreground px-3 py-1">
                                      {standing.totalPoints.toFixed(1)} pts
                                    </Badge>
                                    {pointsBehind > 0 && (
                                      <span className="text-xs text-tertiary-text mt-1">
                                        {pointsBehind.toFixed(1)} pts back
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}

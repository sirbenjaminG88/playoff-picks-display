import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { mockStandingsData, mockWeekResults, PlayerResult } from "@/data/mockStandingsData";

const PlayerCard = ({ player }: { player: PlayerResult }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg">{player.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {player.team}
                  </Badge>
                  <Badge className="ml-auto text-base font-bold">
                    {player.points.toFixed(1)} pts
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Picked by: {player.selectedBy.join(", ")}
                </p>
              </div>
              <ChevronDown
                className={`ml-2 h-5 w-5 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {player.stats.passYards !== undefined && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Pass Yards:</span>
                      <span className="ml-2 font-semibold">{player.stats.passYards}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pass TDs:</span>
                      <span className="ml-2 font-semibold">{player.stats.passTDs}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interceptions:</span>
                      <span className="ml-2 font-semibold">{player.stats.interceptions}</span>
                    </div>
                  </>
                )}
                {player.stats.rushYards !== undefined && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Rush Yards:</span>
                      <span className="ml-2 font-semibold">{player.stats.rushYards}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rush TDs:</span>
                      <span className="ml-2 font-semibold">{player.stats.rushTDs}</span>
                    </div>
                  </>
                )}
                {player.stats.recYards !== undefined && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Rec Yards:</span>
                      <span className="ml-2 font-semibold">{player.stats.recYards}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rec TDs:</span>
                      <span className="ml-2 font-semibold">{player.stats.recTDs}</span>
                    </div>
                  </>
                )}
                {player.stats.fumblesLost !== undefined && player.stats.fumblesLost > 0 && (
                  <div>
                    <span className="text-muted-foreground">Fumbles Lost:</span>
                    <span className="ml-2 font-semibold">{player.stats.fumblesLost}</span>
                  </div>
                )}
                {player.stats.twoPtConversions !== undefined && player.stats.twoPtConversions > 0 && (
                  <div>
                    <span className="text-muted-foreground">2PT Conversions:</span>
                    <span className="ml-2 font-semibold">{player.stats.twoPtConversions}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default function Results() {
  const [activeWeek, setActiveWeek] = useState(1);

  const currentWeekResults = mockWeekResults.find((w) => w.weekNumber === activeWeek);
  
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Results</h1>
          <p className="text-muted-foreground">Weekly scores and overall standings</p>
        </div>

        {/* Week Tabs */}
        <Tabs value={`week-${activeWeek}`} onValueChange={(v) => setActiveWeek(Number(v.split("-")[1]))}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
                  <Card>
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
                      <h2 className="text-xl font-bold">Quarterbacks</h2>
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
                      <h2 className="text-xl font-bold">Running Backs</h2>
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
                      <h2 className="text-xl font-bold">Flex (WR/TE/RB)</h2>
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

                {/* Overall Standings So Far */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Standings (Through Week {weekNum})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {overallStandings.map((standing, index) => (
                      <div
                        key={standing.userId}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-bold text-base">
                            #{index + 1}
                          </Badge>
                          <span className="font-semibold text-lg">{standing.userName}</span>
                        </div>
                        <Badge className="text-lg font-bold">
                          {standing.totalPoints.toFixed(1)} pts
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}

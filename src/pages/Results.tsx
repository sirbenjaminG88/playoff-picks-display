import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockStandingsData } from "@/data/mockStandingsData";

export default function Results() {
  const [activeWeek, setActiveWeek] = useState(1);

  const currentWeekData = mockStandingsData.find((w) => w.weekNumber === activeWeek);
  
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

  const sortedWeeklyPicks = currentWeekData
    ? [...currentWeekData.picks].sort((a, b) => b.weekPoints - a.weekPoints)
    : [];

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

          {[1, 2, 3, 4].map((weekNum) => (
            <TabsContent key={weekNum} value={`week-${weekNum}`} className="space-y-6">
              {/* Weekly Standings */}
              <Card>
                <CardHeader>
                  <CardTitle>Week {weekNum} Standings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedWeeklyPicks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No picks submitted yet for Week {weekNum}
                    </p>
                  ) : (
                    sortedWeeklyPicks.map((pick, index) => (
                      <div
                        key={pick.userId}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-bold">
                              #{index + 1}
                            </Badge>
                            <span className="font-semibold">{pick.userName}</span>
                            <Badge className="ml-auto text-lg font-bold">
                              {pick.weekPoints.toFixed(1)} pts
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex gap-4">
                              <span>
                                <strong>QB:</strong> {pick.qb}
                              </span>
                              <span>
                                <strong>RB:</strong> {pick.rb}
                              </span>
                              <span>
                                <strong>FLEX:</strong> {pick.flex}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

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
          ))}
        </Tabs>
      </div>
    </div>
  );
}

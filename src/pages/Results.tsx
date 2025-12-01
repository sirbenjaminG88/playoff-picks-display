import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerCard } from "@/components/PlayerCard";
import { playoffResultsByWeek } from "@/data/playoffResultsData";
import { calculateWeeklyTotals } from "@/lib/leaderboard";
import { Trophy } from "lucide-react";

const Results = () => {
  const [activeWeek, setActiveWeek] = useState("1");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              EMMA
            </h1>
          </div>
          <p className="text-muted-foreground">
            Extra Month of More Action — 2024–2025 Playoff Results
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
            const weekKey = `week${weekNum}` as keyof typeof playoffResultsByWeek;
            const weekData = playoffResultsByWeek[weekKey];

            return (
              <TabsContent key={weekNum} value={weekNum.toString()} className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Week {weekNum} Selections</h2>
                  <p className="text-muted-foreground">
                    {weekData.qbs.length + weekData.rbs.length + weekData.flex.length} players selected across all positions
                  </p>
                </div>

                {/* QBs Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-red-500 rounded"></span>
                    QBs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {weekData.qbs.map((player) => (
                      <PlayerCard 
                        key={`${weekNum}-${player.name}`}
                        name={player.name}
                        team={player.team}
                        position={player.position}
                        selectedBy={player.selectedBy}
                        photoUrl={undefined}
                        points={player.points ?? null}
                        stats={player.stats}
                      />
                    ))}
                  </div>
                </div>

                {/* RBs Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-blue-500 rounded"></span>
                    RBs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {weekData.rbs.map((player) => (
                      <PlayerCard 
                        key={`${weekNum}-${player.name}`}
                        name={player.name}
                        team={player.team}
                        position={player.position}
                        selectedBy={player.selectedBy}
                        photoUrl={undefined}
                        points={player.points ?? null}
                        stats={player.stats}
                      />
                    ))}
                  </div>
                </div>

                {/* Flex Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-green-500 rounded"></span>
                    Flex (WR/TE)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {weekData.flex.map((player) => (
                      <PlayerCard 
                        key={`${weekNum}-${player.name}`}
                        name={player.name}
                        team={player.team}
                        position={player.position}
                        selectedBy={player.selectedBy}
                        photoUrl={undefined}
                        points={player.points ?? null}
                        stats={player.stats}
                      />
                    ))}
                  </div>
                </div>

                {/* Weekly Leaderboard */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Weekly Scoring</h3>
                  <div className="overflow-hidden rounded-lg border bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="text-left px-4 py-2">Competitor</th>
                          <th className="text-right px-4 py-2">Week {weekNum} Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculateWeeklyTotals(weekData).map((entry, index) => (
                          <tr
                            key={entry.name}
                            className={index === 0 ? "bg-primary/5 font-semibold" : ""}
                          >
                            <td className="px-4 py-2">{entry.name}</td>
                            <td className="px-4 py-2 text-right">
                              {entry.totalPoints.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
};

export default Results;

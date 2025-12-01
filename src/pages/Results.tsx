import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerCard } from "@/components/PlayerCard";
import { weeksData, PlayerPick } from "@/data/picks";
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
            {weeksData.map((week) => (
              <TabsTrigger
                key={week.week}
                value={week.week.toString()}
                className="text-sm sm:text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Week {week.week}
              </TabsTrigger>
            ))}
          </TabsList>

          {weeksData.map((week) => {
            const qbs = week.players.filter(p => p.position === "QB");
            const rbs = week.players.filter(p => p.position === "RB");
            const flex = week.players.filter(p => p.position === "WR" || p.position === "TE");

            return (
              <TabsContent key={week.week} value={week.week.toString()} className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Week {week.week} Selections</h2>
                  <p className="text-muted-foreground">
                    {week.players.length} players selected across all positions
                  </p>
                </div>

                {/* QBs Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="inline-block w-1 h-6 bg-red-500 rounded"></span>
                    QBs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {qbs.map((player) => (
                      <PlayerCard 
                        key={`${week.week}-${player.name}`}
                        name={player.name}
                        team={player.team}
                        position={player.position}
                        selectedBy={player.selectedBy}
                        photoUrl={player.photoUrl}
                        points={player.points}
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
                    {rbs.map((player) => (
                      <PlayerCard 
                        key={`${week.week}-${player.name}`}
                        name={player.name}
                        team={player.team}
                        position={player.position}
                        selectedBy={player.selectedBy}
                        photoUrl={player.photoUrl}
                        points={player.points}
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
                    {flex.map((player) => (
                      <PlayerCard 
                        key={`${week.week}-${player.name}`}
                        name={player.name}
                        team={player.team}
                        position={player.position}
                        selectedBy={player.selectedBy}
                        photoUrl={player.photoUrl}
                        points={player.points}
                      />
                    ))}
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

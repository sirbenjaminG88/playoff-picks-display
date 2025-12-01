import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerCard } from "@/components/PlayerCard";
import { weeksData } from "@/data/picks";
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

          {weeksData.map((week) => (
            <TabsContent key={week.week} value={week.week.toString()} className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Week {week.week} Selections</h2>
                <p className="text-muted-foreground">
                  {week.players.length} players selected across all positions
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {week.players.map((player) => (
                  <PlayerCard key={`${week.week}-${player.name}`} player={player} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default Results;

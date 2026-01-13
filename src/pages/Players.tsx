import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, Users } from "lucide-react";
import { teamColorMap } from "@/lib/teamColors";
import { usePlayerRankings, RankedPlayer } from "@/hooks/usePlayerRankings";
import { getInitials } from "@/lib/displayName";
import { PageHeader } from "@/components/PageHeader";
import { QBIcon, RBIcon, FlexIcon } from "@/components/PositionIcons";

const DEFAULT_SHOW_COUNT = 10;

// Map full team names to abbreviations for team color lookup
const getTeamAbbreviation = (teamName: string): string => {
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

// Stat tile component for the grid layout
const StatTile = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </div>
);

// Stats breakdown component for expanded player cards
const StatsBreakdown = ({ stats, isOverall }: { stats: RankedPlayer["stats"]; isOverall: boolean }) => {
  return (
    <div className="space-y-3">
      {isOverall && (
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Playoff Totals
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Pass Yards" value={Math.round(stats.pass_yds)} />
        <StatTile label="Pass TDs" value={stats.pass_tds} />
        <StatTile label="Interceptions" value={stats.interceptions} />
        <StatTile label="Rush Yards" value={Math.round(stats.rush_yds)} />
        <StatTile label="Rush TDs" value={stats.rush_tds} />
        <StatTile label="Rec Yards" value={Math.round(stats.rec_yds)} />
        <StatTile label="Rec TDs" value={stats.rec_tds} />
        <StatTile label="Fumbles Lost" value={stats.fumbles_lost} />
        <StatTile label="2pt Conv" value={stats.two_pt_conversions} />
      </div>
    </div>
  );
};

interface RankingPlayerCardProps {
  player: RankedPlayer;
  rank: number;
  isOverall: boolean;
}

const RankingPlayerCard = ({ player, rank, isOverall }: RankingPlayerCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const teamAbbrev = getTeamAbbreviation(player.teamName);
  const teamColors = teamColorMap[teamAbbrev] ?? teamColorMap.DEFAULT;

  // Medal emoji for top 3
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const medal = getMedalEmoji(rank);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden border-border">
        <CollapsibleTrigger className="w-full">
          <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            {/* Header: Rank + Avatar + Player Info + Chevron */}
            <div className="flex items-start gap-3">
              {/* Rank */}
              <div className="flex-shrink-0 w-8 h-12 flex items-center justify-center">
                {medal ? (
                  <span className="text-2xl">{medal}</span>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
                )}
              </div>

              {/* Player Avatar */}
              <Avatar className="h-12 w-12 flex-shrink-0">
                {player.imageUrl ? (
                  <img 
                    src={player.imageUrl} 
                    alt={player.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback name={player.name} className="font-semibold text-sm">
                    {getInitials(player.name)}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Player Info Stack */}
              <div className="flex-1 min-w-0">
                {/* Line 1: Name */}
                <h3 className="font-bold text-lg leading-tight text-foreground text-left">{player.name}</h3>

                {/* Line 2: Points Badge + Position */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge className="text-sm font-bold whitespace-nowrap bg-primary text-primary-foreground">
                    {player.fantasyPoints.toFixed(1)} pts
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {player.position}
                  </Badge>
                </div>
              </div>

              {/* Team Badge - aligned to top */}
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 opacity-90"
                style={{ backgroundColor: teamColors.bg, color: teamColors.text }}
              >
                {teamAbbrev}
              </span>

              {/* Chevron */}
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                {isOverall ? "Playoff Totals" : "Week Stats Breakdown"}
              </h4>
              <StatsBreakdown stats={player.stats} isOverall={isOverall} />
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

interface PositionSectionProps {
  title: string;
  icon: React.ReactNode;
  players: RankedPlayer[];
  isOverall: boolean;
}

const PositionSection = ({ title, icon, players, isOverall }: PositionSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  
  if (players.length === 0) return null;

  const displayedPlayers = expanded ? players : players.slice(0, DEFAULT_SHOW_COUNT);
  const remainingCount = players.length - DEFAULT_SHOW_COUNT;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">
        {displayedPlayers.map((player, index) => (
          <RankingPlayerCard 
            key={player.playerId} 
            player={player} 
            rank={index + 1}
            isOverall={isOverall}
          />
        ))}
      </div>
      {remainingCount > 0 && (
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `Show more (${remainingCount} remaining)`}
        </Button>
      )}
    </div>
  );
};

const WeekContent = ({ week, isOverall }: { week: number | "overall"; isOverall: boolean }) => {
  const { data, isLoading, error } = usePlayerRankings(week);

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <p className="text-destructive text-center">
            Error loading rankings: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyPlayers = data && (data.qbs.length > 0 || data.rbs.length > 0 || data.flex.length > 0);

  if (!hasAnyPlayers) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            No player stats available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PositionSection 
        title="Quarterbacks" 
        icon={<QBIcon className="w-6 h-6" />} 
        players={data.qbs} 
        isOverall={isOverall}
      />
      <PositionSection 
        title="Running Backs" 
        icon={<RBIcon className="w-6 h-6" />} 
        players={data.rbs} 
        isOverall={isOverall}
      />
      <PositionSection 
        title="Flex (WR/TE)" 
        icon={<FlexIcon className="w-6 h-6" />} 
        players={data.flex} 
        isOverall={isOverall}
      />
    </div>
  );
};

export default function Players() {
  const [activeTab, setActiveTab] = useState("1");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6">
        <PageHeader
          title="Players"
          subtitle="Top performers by week"
          icon={<Users className="w-7 h-7 text-primary" />}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-muted/30">
            <TabsTrigger 
              value="1" 
              className="text-xs py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Wild Card
            </TabsTrigger>
            <TabsTrigger 
              value="2" 
              className="text-xs py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Div
            </TabsTrigger>
            <TabsTrigger 
              value="3" 
              className="text-xs py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Conf
            </TabsTrigger>
            <TabsTrigger 
              value="4" 
              className="text-xs py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Super Bowl
            </TabsTrigger>
            <TabsTrigger 
              value="overall" 
              className="text-xs py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Overall
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="1" className="mt-0">
              <WeekContent week={1} isOverall={false} />
            </TabsContent>
            <TabsContent value="2" className="mt-0">
              <WeekContent week={2} isOverall={false} />
            </TabsContent>
            <TabsContent value="3" className="mt-0">
              <WeekContent week={3} isOverall={false} />
            </TabsContent>
            <TabsContent value="4" className="mt-0">
              <WeekContent week={4} isOverall={false} />
            </TabsContent>
            <TabsContent value="overall" className="mt-0">
              <WeekContent week="overall" isOverall={true} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

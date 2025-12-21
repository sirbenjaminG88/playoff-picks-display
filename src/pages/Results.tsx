import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, Loader2, Radio, Lock, Clock } from "lucide-react";
import { teamColorMap } from "@/lib/teamColors";
import { useWeekPicks, GroupedPlayer, PlayerWeekStats, UserProfile } from "@/hooks/useWeekPicks";
import { useRegularSeasonPicks, GroupedPlayer as RegularGroupedPlayer, UserProfile as RegularUserProfile } from "@/hooks/useRegularSeasonPicks";
import { getWeekLabel, getWeekTabLabel } from "@/data/weekLabels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useLeague } from "@/contexts/LeagueContext";
import { formatGameDateET } from "@/lib/timezone";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";

// Beta weeks for 2025 regular season
const REGULAR_SEASON_WEEKS = [14, 15, 16, 17];

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Stat tile component for the grid layout
const StatTile = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </div>
);

// Stats breakdown component for expanded player cards
const StatsBreakdown = ({ stats }: { stats: PlayerWeekStats | null }) => {
  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Stats will appear here once games have been played.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile label="Pass Yards" value={Math.round(stats.pass_yds)} />
      <StatTile label="Pass TDs" value={stats.pass_tds} />
      <StatTile label="Interceptions" value={stats.interceptions} />
      <StatTile label="Rush Yards" value={Math.round(stats.rush_yds)} />
      <StatTile label="Rush TDs" value={stats.rush_tds} />
      <StatTile label="Rec Yards" value={Math.round(stats.rec_yds)} />
      <StatTile label="Rec TDs" value={stats.rec_tds} />
      <StatTile label="Fumbles Lost" value={stats.fumbles_lost} />
    </div>
  );
};

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

// Generic player card that works with both playoff and regular season data
interface PlayerCardProps {
  player: GroupedPlayer | RegularGroupedPlayer;
  userProfiles?: Map<string, UserProfile | RegularUserProfile>;
}

const PlayerCard = ({ player, userProfiles }: PlayerCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isPopular = player.selectedBy.length > 1;
  const isUnique = player.selectedBy.length === 1;
  const teamAbbrev = 'teamAbbr' in player ? player.teamAbbr : getTeamAbbreviation(player.teamName);
  const teamColors = teamColorMap[teamAbbrev] ?? teamColorMap.DEFAULT;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden border-border">
        <CollapsibleTrigger className="w-full">
          <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            {/* Header: Avatar + Player Info + Chevron */}
            <div className="flex items-start gap-3 mb-3">
              {/* Player Avatar */}
              <Avatar className="h-12 w-12 flex-shrink-0">
                {player.imageUrl ? (
                  <img 
                    src={player.imageUrl} 
                    alt={player.playerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-foreground/80 text-background font-semibold text-sm">
                    {getInitials(player.playerName)}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Player Info Stack */}
              <div className="flex-1 min-w-0">
                {/* Line 1: Name + Team Badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold text-lg leading-tight text-foreground">{player.playerName}</h3>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs font-semibold ml-auto opacity-90"
                    style={{ backgroundColor: teamColors.bg, color: teamColors.text }}
                  >
                    {teamAbbrev}
                  </span>
                </div>

                {/* Line 2: Points Badge + Popular/Unique Tag */}
                <div className="flex items-center gap-2">
                  <Badge className={`text-sm font-bold ${player.hasStats ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
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
                {player.selectedBy.map((userId) => {
                  const profile = userProfiles?.get(userId);
                  return (
                    <Avatar key={userId} className="h-6 w-6 border-2 border-card">
                      {profile?.avatarUrl ? (
                        <AvatarImage src={profile.avatarUrl} alt={userId} />
                      ) : null}
                      <AvatarFallback className="bg-foreground/80 text-background text-[10px] font-medium">
                        {getInitials(userId)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
              </div>
              <span className="text-sm text-muted-foreground">
                {player.selectedBy.join(", ")}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Week Stats Breakdown</h4>
              <StatsBreakdown stats={player.stats} />
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const PositionSection = ({ 
  title, 
  players,
  userProfiles
}: { 
  title: string; 
  players: (GroupedPlayer | RegularGroupedPlayer)[];
  userProfiles?: Map<string, UserProfile | RegularUserProfile>;
}) => {
  if (players.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <span className="inline-block w-1 h-6 bg-primary rounded"></span>
        {title}
      </h2>
      <div className="space-y-3">
        {players.map((player) => (
          <PlayerCard key={player.playerId} player={player} userProfiles={userProfiles} />
        ))}
      </div>
    </div>
  );
};

// Playoff week results component
const WeekResults = ({ week }: { week: number }) => {
  const { data, isLoading, error } = useWeekPicks(week);

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
            Error loading picks: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyPicks = data && (data.qbs.length > 0 || data.rbs.length > 0 || data.flex.length > 0);

  if (!hasAnyPicks) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            No picks submitted for {getWeekLabel(week)} yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PositionSection title="Quarterbacks" players={data.qbs} userProfiles={data.userProfiles} />
      <PositionSection title="Running Backs" players={data.rbs} userProfiles={data.userProfiles} />
      <PositionSection title="Flex (WR/TE)" players={data.flex} userProfiles={data.userProfiles} />
    </div>
  );
};

// Regular season week results component
const RegularSeasonWeekResults = ({
  week,
  leagueId,
}: {
  week: number;
  leagueId: string;
}) => {
  const { data, isLoading, error } = useRegularSeasonPicks(week, leagueId);

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
            Error loading picks: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if picks are revealed
  if (data && !data.isRevealed && data.revealStatus) {
    const { submittedCount, leagueMemberCount, firstGameKickoff } = data.revealStatus;
    return (
      <div className="space-y-6">
        {/* Info banner */}
        <Alert className="bg-muted/30 border-border">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium text-foreground">Picks will be revealed after kickoff.</span>
            <span className="text-muted-foreground ml-1">
              {firstGameKickoff ? `First game: ${formatGameDateET(firstGameKickoff)}` : ''}
            </span>
            <span className="text-muted-foreground ml-2">
              ({submittedCount}/{leagueMemberCount} submitted)
            </span>
          </AlertDescription>
        </Alert>

        {/* Position sections with hidden placeholder */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-block w-1 h-6 bg-primary rounded"></span>
            Quarterbacks
          </h2>
          <Card className="border-border bg-muted/10">
            <CardContent className="py-6 text-center text-muted-foreground">
              Hidden until kickoff
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-block w-1 h-6 bg-primary rounded"></span>
            Running Backs
          </h2>
          <Card className="border-border bg-muted/10">
            <CardContent className="py-6 text-center text-muted-foreground">
              Hidden until kickoff
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="inline-block w-1 h-6 bg-primary rounded"></span>
            Flex (WR/TE)
          </h2>
          <Card className="border-border bg-muted/10">
            <CardContent className="py-6 text-center text-muted-foreground">
              Hidden until kickoff
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasAnyPicks = data && (data.qbs.length > 0 || data.rbs.length > 0 || data.flex.length > 0);

  if (!hasAnyPicks) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            No picks have been submitted for Week {week} yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PositionSection title="Quarterbacks" players={data.qbs} userProfiles={data.userProfiles} />
      <PositionSection title="Running Backs" players={data.rbs} userProfiles={data.userProfiles} />
      <PositionSection title="Flex (WR/TE)" players={data.flex} userProfiles={data.userProfiles} />
    </div>
  );
};

// Regular season leaderboard for a specific week
const RegularSeasonWeekLeaderboard = ({ week, leagueId }: { week: number; leagueId: string }) => {
  const { data, isLoading } = useRegularSeasonPicks(week, leagueId);

  if (isLoading || !data) {
    return null;
  }

  // If picks are not revealed, show simple message
  if (!data.isRevealed) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Hidden until kickoff
      </div>
    );
  }

  // Calculate points per user for this week
  const userPoints = new Map<string, number>();
  
  [...data.qbs, ...data.rbs, ...data.flex].forEach((player) => {
    player.selectedBy.forEach((userId) => {
      const current = userPoints.get(userId) || 0;
      userPoints.set(userId, current + player.points);
    });
  });

  const leaderboard = Array.from(userPoints.entries())
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points);

  if (leaderboard.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No picks submitted for Week {week}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((entry, index) => {
        const profile = data.userProfiles?.get(entry.userId);
        return (
          <div
            key={entry.userId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            {/* Rank - fixed width, no shrink */}
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="font-semibold text-sm text-foreground">
                #{index + 1}
              </span>
            </div>

            {/* Avatar + Name container */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="h-9 w-9 flex-shrink-0">
                {profile?.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={entry.userId} />
                ) : null}
                <AvatarFallback className="bg-foreground/80 text-background font-semibold text-xs">
                  {getInitials(entry.userId)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-foreground whitespace-normal break-words leading-tight">
                {entry.userId}
              </span>
            </div>

            {/* Points pill - right aligned, no shrink */}
            <div className="ml-auto flex-shrink-0">
              <Badge className="text-sm font-bold bg-primary text-primary-foreground px-3 py-1">
                {entry.points.toFixed(1)} pts
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Regular season overall leaderboard
const RegularSeasonOverallLeaderboard = ({ throughWeek, leagueId }: { throughWeek: number; leagueId: string }) => {
  const week14 = useRegularSeasonPicks(14, leagueId);
  const week15 = useRegularSeasonPicks(15, leagueId);
  const week16 = useRegularSeasonPicks(16, leagueId);
  const week17 = useRegularSeasonPicks(17, leagueId);

  // Build week queries based on throughWeek
  const weekQueriesMap: Record<number, typeof week14> = {
    14: week14,
    15: week15,
    16: week16,
    17: week17,
  };

  const weeksToInclude = REGULAR_SEASON_WEEKS.filter(w => w <= throughWeek);
  const weekQueries = weeksToInclude.map(w => weekQueriesMap[w]);

  const isLoading = weekQueries.some((w) => w?.isLoading);

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Aggregate points across all weeks (only count revealed weeks)
  const userTotalPoints = new Map<string, number>();

  weekQueries.forEach((weekQuery) => {
    if (!weekQuery?.data) return;
    // Skip weeks where picks are not revealed
    if (!weekQuery.data.isRevealed) return;
    
    const allPlayers = [
      ...(weekQuery.data.qbs || []), 
      ...(weekQuery.data.rbs || []), 
      ...(weekQuery.data.flex || [])
    ];
    
    allPlayers.forEach((player) => {
      player.selectedBy.forEach((userId) => {
        const current = userTotalPoints.get(userId) || 0;
        userTotalPoints.set(userId, current + (player.points || 0));
      });
    });
  });

  const standings = Array.from(userTotalPoints.entries())
    .map(([userId, totalPoints]) => ({ userId, totalPoints }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  if (standings.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No stats yet. Overall leaderboard will appear once games are played.
        </p>
      </div>
    );
  }

  const leaderPoints = standings[0]?.totalPoints || 0;

  // Aggregate userProfiles from all weeks
  const allUserProfiles = new Map<string, UserProfile>();
  weekQueries.forEach((weekQuery) => {
    if (weekQuery?.data?.userProfiles) {
      weekQuery.data.userProfiles.forEach((profile, key) => {
        allUserProfiles.set(key, profile);
      });
    }
  });

  return (
    <div className="space-y-3">
      {standings.map((standing, index) => {
        const pointsBehind = index > 0 ? leaderPoints - standing.totalPoints : 0;
        const profile = allUserProfiles.get(standing.userId);
        
        return (
          <div
            key={standing.userId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            {/* Rank - fixed width, no shrink */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="font-semibold text-sm text-foreground">
                #{index + 1}
              </span>
            </div>

            {/* Avatar + Name container */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="h-10 w-10 flex-shrink-0">
                {profile?.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={standing.userId} />
                ) : null}
                <AvatarFallback className="bg-foreground/80 text-background font-bold text-sm">
                  {getInitials(standing.userId)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-foreground whitespace-normal break-words leading-tight">
                {standing.userId}
              </span>
            </div>

            {/* Points pill - right aligned, no shrink */}
            <div className="ml-auto flex-shrink-0 flex flex-col items-end gap-1">
              <Badge className="text-sm font-bold bg-primary text-primary-foreground px-3 py-1.5">
                {standing.totalPoints.toFixed(1)} pts
              </Badge>
              {pointsBehind > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {pointsBehind.toFixed(1)} back
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const WeekLeaderboard = ({ week }: { week: number }) => {
  const { data, isLoading } = useWeekPicks(week);

  if (isLoading || !data) {
    return null;
  }

  // Calculate points per user for this week
  const userPoints = new Map<string, number>();
  
  [...data.qbs, ...data.rbs, ...data.flex].forEach((player) => {
    player.selectedBy.forEach((userId) => {
      const current = userPoints.get(userId) || 0;
      userPoints.set(userId, current + player.points);
    });
  });

  const leaderboard = Array.from(userPoints.entries())
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points);

  if (leaderboard.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No picks submitted for {getWeekLabel(week)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((entry, index) => {
        const profile = data.userProfiles?.get(entry.userId);
        return (
          <div
            key={entry.userId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            {/* Rank - fixed width, no shrink */}
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="font-semibold text-sm text-foreground">
                #{index + 1}
              </span>
            </div>

            {/* Avatar + Name container */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="h-9 w-9 flex-shrink-0">
                {profile?.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={entry.userId} />
                ) : null}
                <AvatarFallback className="bg-foreground/80 text-background font-semibold text-xs">
                  {getInitials(entry.userId)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-foreground whitespace-normal break-words leading-tight">
                {entry.userId}
              </span>
            </div>

            {/* Points pill - right aligned, no shrink */}
            <div className="ml-auto flex-shrink-0">
              <Badge className="text-sm font-bold bg-primary text-primary-foreground px-3 py-1">
                {entry.points.toFixed(1)} pts
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 2025 Regular Season Fantasy Results
// Hook to fetch last stats update timestamp
function useLastStatsUpdate(week: number) {
  return useQuery({
    queryKey: ['lastStatsUpdate', week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_week_stats')
        .select('updated_at')
        .eq('season', 2025)
        .eq('week', week)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.updated_at || null;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

function RegularSeasonResults() {
  const { currentLeague, isCommissioner, loading: leagueLoading } = useLeague();
  const [activeWeek, setActiveWeek] = useState(14);
  const [leaderboardTab, setLeaderboardTab] = useState<"weekly" | "overall">("weekly");
  const [isLive, setIsLive] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch last stats update timestamp for current week
  const { data: lastStatsUpdate } = useLastStatsUpdate(activeWeek);

  // Realtime subscription for live stat updates
  useEffect(() => {
    if (!currentLeague) return;

    console.log('Setting up realtime subscription for player_week_stats...');
    
    const channel = supabase
      .channel('player-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_week_stats',
          filter: `season=eq.2025`,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          setIsLive(true);
          
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['regularSeasonPicks'] });
          queryClient.invalidateQueries({ queryKey: ['lastStatsUpdate'] });
          
          // Reset live indicator after 3 seconds
          setTimeout(() => setIsLive(false), 3000);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [currentLeague, queryClient]);


  // Show loading state while league is being fetched
  if (leagueLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!currentLeague) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            Please join a league to view results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Live indicator */}
      {isLive && (
        <div className="mb-4 flex items-center gap-2 text-sm text-primary animate-pulse">
          <Radio className="w-4 h-4" />
          <span>Live update received</span>
        </div>
      )}
      
      <Tabs value={`week-${activeWeek}`} onValueChange={(v) => setActiveWeek(Number(v.split("-")[1]))}>
        <TabsList className="w-full flex overflow-x-auto mb-6 bg-muted/50 border border-border p-1 gap-1">
          {REGULAR_SEASON_WEEKS.map((weekNum) => (
            <TabsTrigger 
              key={weekNum}
              value={`week-${weekNum}`} 
              className="flex-1 min-w-[70px] px-2 py-2 flex flex-col items-center gap-0.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">WK {weekNum}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {REGULAR_SEASON_WEEKS.map((weekNum) => (
          <TabsContent key={weekNum} value={`week-${weekNum}`} className="space-y-6">
            <RegularSeasonWeekResults
              week={weekNum}
              leagueId={currentLeague.id}
            />

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

                <TabsContent value="weekly" className="mt-0">
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-4 px-6 pt-6">
                      <CardTitle className="text-foreground text-xl">Week {weekNum} Standings</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                      <RegularSeasonWeekLeaderboard week={weekNum} leagueId={currentLeague.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="overall" className="mt-0">
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-4 px-6 pt-6">
                      <CardTitle className="text-foreground text-xl">Overall Standings (Through Week {weekNum})</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                      <RegularSeasonOverallLeaderboard throughWeek={weekNum} leagueId={currentLeague.id} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Debug: Last stats update indicator */}
      {lastStatsUpdate && (
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Last stats update: {new Date(lastStatsUpdate).toLocaleString('en-US', { 
              timeZone: 'America/New_York',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })} ET
          </p>
        </div>
      )}
    </div>
  );
}

function OverallLeaderboard({ throughWeek }: { throughWeek: number }) {
  // Fetch all weeks up to throughWeek
  const week1 = useWeekPicks(1);
  const week2 = useWeekPicks(2);
  const week3 = useWeekPicks(3);
  const week4 = useWeekPicks(4);

  const weekQueriesMap: Record<number, typeof week1> = {
    1: week1,
    2: week2,
    3: week3,
    4: week4,
  };

  const weeksToInclude = [1, 2, 3, 4].filter(w => w <= throughWeek);
  const weekQueries = weeksToInclude.map(w => weekQueriesMap[w]);

  const isLoading = weekQueries.some((w) => w?.isLoading);

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Aggregate points across all weeks
  const userTotalPoints = new Map<string, number>();

  weekQueries.forEach((weekQuery) => {
    if (!weekQuery?.data) return;
    
    const allPlayers = [
      ...(weekQuery.data.qbs || []), 
      ...(weekQuery.data.rbs || []), 
      ...(weekQuery.data.flex || [])
    ];
    
    allPlayers.forEach((player) => {
      player.selectedBy.forEach((userId) => {
        const current = userTotalPoints.get(userId) || 0;
        userTotalPoints.set(userId, current + (player.points || 0));
      });
    });
  });

  const standings = Array.from(userTotalPoints.entries())
    .map(([userId, totalPoints]) => ({ userId, totalPoints }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  if (standings.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No stats yet. Overall leaderboard will appear once games are played.
        </p>
      </div>
    );
  }

  const leaderPoints = standings[0]?.totalPoints || 0;

  return (
    <div className="space-y-5">
      {standings.map((standing, index) => {
        const pointsBehind = index > 0 ? leaderPoints - standing.totalPoints : 0;
        
        return (
          <div
            key={standing.userId}
            className="flex items-start gap-6 px-6 py-6 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors min-h-[100px]"
          >
            <div className="w-[44px] h-[44px] rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="font-semibold text-base text-foreground">
                #{index + 1}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <Avatar className="h-[44px] w-[44px]">
                <AvatarFallback className="bg-foreground/80 text-background font-bold text-[17px]">
                  {getInitials(standing.userId)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm text-foreground">
                {standing.userId}
              </span>
            </div>

            <div className="flex-1 min-w-0"></div>

            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <Badge className="text-base font-bold bg-primary text-primary-foreground px-4 py-1.5 h-[44px] flex items-center">
                {standing.totalPoints.toFixed(1)} pts
              </Badge>
              {pointsBehind > 0 && (
                <span className="text-[13px] text-muted-foreground font-medium">
                  {pointsBehind.toFixed(1)} back
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Results() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [leaderboardTab, setLeaderboardTab] = useState<"weekly" | "overall">("weekly");
  const { currentLeague } = useLeague();
  
  // Derive isRegularSeason from current league's season_type
  const isRegularSeason = currentLeague?.season_type === "REG";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-4xl font-bold text-foreground">Results</h1>
            
            {/* League Switcher */}
            <LeagueSwitcher />
          </div>
          <p className="text-muted-foreground">
            {isRegularSeason 
              ? "2025 Regular Season Beta — Fantasy Results" 
              : "Weekly scores and overall standings"}
          </p>
        </div>

        {/* 2025 Regular Season Fantasy View */}
        {isRegularSeason ? (
          <RegularSeasonResults />
        ) : (
          /* 2024 Playoffs View (Default) */
          <Tabs value={`week-${activeWeek}`} onValueChange={(v) => setActiveWeek(Number(v.split("-")[1]))}>
            <TabsList className="w-full flex overflow-x-auto mb-6 bg-muted/50 border border-border p-1 gap-1">
              {[1, 2, 3, 4].map((weekNum) => {
                const tabLabel = getWeekTabLabel(weekNum);
                return (
                  <TabsTrigger 
                    key={weekNum}
                    value={`week-${weekNum}`} 
                    className="flex-1 min-w-[70px] px-2 py-2 flex flex-col items-center gap-0.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">{tabLabel.abbrev}</span>
                    <span className="text-[9px] sm:text-[10px] font-medium opacity-70">{tabLabel.dates}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {[1, 2, 3, 4].map((weekNum) => (
              <TabsContent key={weekNum} value={`week-${weekNum}`} className="space-y-6">
                <WeekResults week={weekNum} />

                {/* Leaderboards Section */}
                <div className="mt-8">
                  <Tabs value={leaderboardTab} onValueChange={(v) => setLeaderboardTab(v as "weekly" | "overall")}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 border border-border p-1">
                      <TabsTrigger
                        value="weekly"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {getWeekLabel(weekNum)} Leaderboard
                      </TabsTrigger>
                      <TabsTrigger 
                        value="overall"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Overall Leaderboard
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="weekly" className="mt-0">
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4 px-6 pt-6">
                          <CardTitle className="text-foreground text-xl">{getWeekLabel(weekNum)} Standings</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                          <WeekLeaderboard week={weekNum} />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="overall" className="mt-0">
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-4 px-6 pt-6">
                          <CardTitle className="text-foreground text-xl">Overall Standings (Through {getWeekLabel(weekNum)})</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                          <OverallLeaderboard throughWeek={weekNum} />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}

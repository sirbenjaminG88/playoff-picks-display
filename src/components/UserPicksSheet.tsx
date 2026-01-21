import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getInitials } from "@/lib/displayName";
import { teamColorMap } from "@/lib/teamColors";
import { WEEK_LABELS } from "@/data/weekLabels";

interface UserPicksSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string; // auth UUID
  displayName: string;
  avatarUrl: string | null;
  leagueId: string;
  totalPoints?: number;
  winProbability?: number;
  colorIndex?: number;
}

interface PickData {
  week: number;
  position_slot: string;
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
}

interface PlayerImage {
  player_id: number;
  image_url: string | null;
}

interface PlayerStats {
  player_id: number;
  week: number;
  fantasy_points_standard: number | null;
}

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

function useUserAllPicks(userId: string, leagueId: string, season: number = 2025) {
  return useQuery({
    queryKey: ["userAllPicks", userId, leagueId, season],
    queryFn: async () => {
      // Fetch all picks for this user in this league for playoff weeks 1-4
      const { data: picks, error: picksError } = await supabase
        .from("user_picks")
        .select("week, position_slot, player_id, player_name, team_name, position")
        .eq("auth_user_id", userId)
        .eq("league_id", leagueId)
        .eq("season", season)
        .in("week", [1, 2, 3, 4])
        .order("week")
        .order("position_slot");

      if (picksError) throw picksError;
      if (!picks || picks.length === 0) return { picks: [], images: new Map(), stats: new Map() };

      const playerIds = [...new Set(picks.map((p) => p.player_id))];

      // Fetch player images
      const { data: players } = await supabase
        .from("playoff_players")
        .select("player_id, image_url")
        .in("player_id", playerIds)
        .eq("season", season);

      const imageMap = new Map<number, string | null>();
      players?.forEach((p: PlayerImage) => {
        imageMap.set(p.player_id, p.image_url);
      });

      // Fetch stats for all weeks
      const { data: stats } = await supabase
        .from("player_week_stats")
        .select("player_id, week, fantasy_points_standard")
        .in("player_id", playerIds)
        .eq("season", season)
        .in("week", [1, 2, 3, 4]);

      const statsMap = new Map<string, number | null>();
      stats?.forEach((s: PlayerStats) => {
        statsMap.set(`${s.player_id}-${s.week}`, s.fantasy_points_standard);
      });

      return { picks: picks as PickData[], images: imageMap, stats: statsMap };
    },
    enabled: !!userId && !!leagueId,
  });
}

// Position slot order for sorting
const SLOT_ORDER: Record<string, number> = { QB: 0, RB: 1, FLEX: 2 };

export function UserPicksSheet({
  isOpen,
  onClose,
  userId,
  displayName,
  avatarUrl,
  leagueId,
  totalPoints,
  winProbability,
  colorIndex,
}: UserPicksSheetProps) {
  const { data, isLoading } = useUserAllPicks(userId, leagueId);

  // Group picks by week
  const picksByWeek = new Map<number, PickData[]>();
  data?.picks.forEach((pick) => {
    const existing = picksByWeek.get(pick.week) || [];
    existing.push(pick);
    picksByWeek.set(pick.week, existing);
  });

  // Sort picks within each week by position slot
  picksByWeek.forEach((picks, week) => {
    picks.sort((a, b) => (SLOT_ORDER[a.position_slot] ?? 99) - (SLOT_ORDER[b.position_slot] ?? 99));
    picksByWeek.set(week, picks);
  });

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback colorIndex={colorIndex} className="font-bold text-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <DrawerTitle className="text-left">{displayName}</DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                {totalPoints !== undefined && (
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {totalPoints.toFixed(1)} pts
                  </Badge>
                )}
                {winProbability !== undefined && winProbability > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {winProbability}% to win
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              {[1, 2, 3, 4].map((week) => {
                const weekPicks = picksByWeek.get(week);
                return (
                  <div key={week} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {WEEK_LABELS[week]}
                    </h3>
                    {weekPicks && weekPicks.length > 0 ? (
                      <div className="space-y-2">
                        {weekPicks.map((pick) => {
                          const imageUrl = data?.images.get(pick.player_id);
                          const points = data?.stats.get(`${pick.player_id}-${pick.week}`);
                          const teamAbbrev = getTeamAbbreviation(pick.team_name);
                          const teamColors = teamColorMap[teamAbbrev] ?? teamColorMap.DEFAULT;

                          return (
                            <div
                              key={`${pick.week}-${pick.position_slot}`}
                              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border"
                            >
                              {/* Player Headshot */}
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                {imageUrl ? (
                                  <AvatarImage src={imageUrl} alt={pick.player_name} />
                                ) : null}
                                <AvatarFallback className="text-xs font-medium">
                                  {getInitials(pick.player_name)}
                                </AvatarFallback>
                              </Avatar>

                              {/* Player Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {pick.player_name}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                    style={{ backgroundColor: teamColors.bg, color: teamColors.text }}
                                  >
                                    {teamAbbrev}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {pick.position_slot}
                                  </span>
                                </div>
                              </div>

                              {/* Points */}
                              <div className="flex-shrink-0">
                                {points !== undefined && points !== null ? (
                                  <Badge className="bg-primary/80 text-primary-foreground text-xs font-semibold">
                                    {points.toFixed(1)} pts
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic py-2">
                        Not submitted yet
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

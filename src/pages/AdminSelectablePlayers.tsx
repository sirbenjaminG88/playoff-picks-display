import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, RotateCcw, Check, X, Minus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type SelectionOverride = "auto" | "include" | "exclude";

interface SelectablePlayerV2 {
  id: string;
  player_id: number;
  name: string;
  position: string;
  team_name: string;
  team_id: number;
  image_url: string | null;
  depth_chart_slot: string | null;
  depth_chart_rank: number | null;
  is_starter: boolean | null;
  season: number;
  selection_override: SelectionOverride;
  is_selectable: boolean;
  depth_chart_label: string | null;
}

const AdminSelectablePlayers = () => {
  const [players, setPlayers] = useState<SelectablePlayerV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [updatingPlayers, setUpdatingPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("selectable_playoff_players_v2" as any)
      .select("*")
      .order("team_name")
      .order("position")
      .order("depth_chart_rank");

    if (error) {
      console.error("Error loading players:", error);
      toast({
        title: "Error loading players",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPlayers((data as unknown as SelectablePlayerV2[]) || []);
    }
    setLoading(false);
  };

  const teams = useMemo(() => [...new Set(players.map((p) => p.team_name))].sort(), [players]);
  const positions = useMemo(() => [...new Set(players.map((p) => p.position))].sort(), [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (teamFilter !== "all" && p.team_name !== teamFilter) return false;
      if (positionFilter !== "all" && p.position !== positionFilter) return false;
      return true;
    });
  }, [players, teamFilter, positionFilter]);

  // Group players by team
  const playersByTeam = useMemo(() => {
    const grouped: Record<string, SelectablePlayerV2[]> = {};
    for (const player of filteredPlayers) {
      if (!grouped[player.team_name]) {
        grouped[player.team_name] = [];
      }
      grouped[player.team_name].push(player);
    }
    return grouped;
  }, [filteredPlayers]);

  // Team stats
  const teamStats = useMemo(() => {
    const stats: Record<string, { total: number; included: number }> = {};
    for (const player of players) {
      if (!stats[player.team_name]) {
        stats[player.team_name] = { total: 0, included: 0 };
      }
      stats[player.team_name].total++;
      if (player.is_selectable) {
        stats[player.team_name].included++;
      }
    }
    return stats;
  }, [players]);

  const totalIncluded = useMemo(() => players.filter((p) => p.is_selectable).length, [players]);

  const toggleTeam = (teamName: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
        next.add(teamName);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedTeams(new Set(teams));
  const collapseAll = () => setExpandedTeams(new Set());

  const updatePlayerOverride = async (playerId: string, override: SelectionOverride) => {
    setUpdatingPlayers((prev) => new Set(prev).add(playerId));
    
    const { error } = await supabase
      .from("playoff_players")
      .update({ selection_override: override })
      .eq("id", playerId);

    if (error) {
      console.error("Error updating player:", error);
      toast({
        title: "Error updating player",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Optimistic update
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== playerId) return p;
          const newOverride = override;
          const isSelectable =
            newOverride === "include"
              ? true
              : newOverride === "exclude"
              ? false
              : // Auto logic
                p.depth_chart_slot !== null &&
                p.depth_chart_rank !== null &&
                ((p.depth_chart_slot === "qb" && (p.depth_chart_rank === 0 || p.depth_chart_rank === 1)) ||
                  (p.depth_chart_slot === "rb" && (p.depth_chart_rank === 0 || p.depth_chart_rank === 1)) ||
                  (["wr1", "wr2", "wr3"].includes(p.depth_chart_slot) && p.depth_chart_rank === 0) ||
                  (p.depth_chart_slot === "te" && (p.depth_chart_rank === 0 || p.depth_chart_rank === 1)));
          return { ...p, selection_override: newOverride, is_selectable: isSelectable };
        })
      );
      toast({
        title: "Player updated",
        description: `Selection override set to ${override}`,
      });
    }

    setUpdatingPlayers((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
  };

  const resetAllToAuto = async () => {
    const playerIds = players.filter((p) => p.selection_override !== "auto").map((p) => p.id);
    if (playerIds.length === 0) {
      toast({ title: "All players already set to Auto" });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("playoff_players")
      .update({ selection_override: "auto" })
      .in("id", playerIds);

    if (error) {
      console.error("Error resetting players:", error);
      toast({
        title: "Error resetting players",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "All players reset to Auto",
        description: `${playerIds.length} players updated`,
      });
      await loadPlayers();
    }
    setLoading(false);
  };

  const getStatusBadge = (player: SelectablePlayerV2) => {
    if (player.selection_override === "include") {
      return <Badge variant="default" className="bg-green-600 text-xs">Included</Badge>;
    }
    if (player.selection_override === "exclude") {
      return <Badge variant="destructive" className="text-xs">Excluded</Badge>;
    }
    // Auto
    if (player.is_selectable) {
      return <Badge variant="secondary" className="text-xs">Auto ✓</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-muted-foreground">Auto ✗</Badge>;
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Selectable Playoff Players</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{players.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalIncluded}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teams.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{positions.join(", ")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team} ({teamStats[team]?.included || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button variant="secondary" size="sm" onClick={resetAllToAuto}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All to Auto
            </Button>

            <span className="text-sm text-muted-foreground self-center ml-auto">
              Showing {filteredPlayers.length} players
            </span>
          </div>

          {/* Players grouped by team */}
          <div className="space-y-2">
            {Object.entries(playersByTeam)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([teamName, teamPlayers]) => {
                const isExpanded = expandedTeams.has(teamName);
                const stats = teamStats[teamName];

                return (
                  <Collapsible
                    key={teamName}
                    open={isExpanded}
                    onOpenChange={() => toggleTeam(teamName)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                              <CardTitle className="text-base font-semibold">{teamName}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {stats?.included || 0} / {stats?.total || 0} included
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4">
                          <div className="space-y-2">
                            {teamPlayers.map((player) => (
                              <div
                                key={player.id}
                                className={cn(
                                  "flex items-center gap-4 p-3 rounded-lg border",
                                  player.is_selectable
                                    ? "bg-green-900/30 border-green-700"
                                    : "bg-muted/30 border-border"
                                )}
                              >
                                {/* Photo */}
                                {player.image_url ? (
                                  <img
                                    src={player.image_url}
                                    alt={player.name}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                                    N/A
                                  </div>
                                )}

                                {/* Player Info */}
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                  <span className="font-medium truncate text-foreground min-w-[140px]">{player.name}</span>
                                  <Badge variant="secondary" className="text-xs w-10 justify-center flex-shrink-0">
                                    {player.position}
                                  </Badge>
                                  <div className="w-12 flex-shrink-0">
                                    {player.depth_chart_label && (
                                      <Badge className="text-xs font-mono bg-green-600 text-white w-full justify-center">
                                        {player.depth_chart_label}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className="flex-shrink-0">{getStatusBadge(player)}</div>

                                {/* Override Toggle */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant={player.selection_override === "include" ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                      "h-8 w-8 p-0",
                                      player.selection_override === "include" && "bg-green-600 hover:bg-green-700"
                                    )}
                                    onClick={() => updatePlayerOverride(player.id, "include")}
                                    disabled={updatingPlayers.has(player.id)}
                                    title="Include"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant={player.selection_override === "auto" ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => updatePlayerOverride(player.id, "auto")}
                                    disabled={updatingPlayers.has(player.id)}
                                    title="Auto"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant={player.selection_override === "exclude" ? "destructive" : "outline"}
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => updatePlayerOverride(player.id, "exclude")}
                                    disabled={updatingPlayers.has(player.id)}
                                    title="Exclude"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSelectablePlayers;

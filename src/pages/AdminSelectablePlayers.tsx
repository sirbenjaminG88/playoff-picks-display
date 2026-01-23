import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, RotateCcw, Check, X, Minus, AlertTriangle, RefreshCw, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DKSalaryImportModal } from "@/components/admin/DKSalaryImportModal";
import { PLAYOFF_WEEK_LABELS } from "@/lib/teamAbbreviations";

type SelectionOverride = "auto" | "include" | "exclude";
type InjuryStatus = "active" | "out" | "ir" | "questionable" | "doubtful" | "probable";

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
  injury_status: InjuryStatus | null;
  dk_salary: number | null;
  dk_salary_week: number | null;
}

const AdminSelectablePlayers = () => {
  const [players, setPlayers] = useState<SelectablePlayerV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [updatingPlayers, setUpdatingPlayers] = useState<Set<string>>(new Set());
  const [syncingInjuries, setSyncingInjuries] = useState(false);
  const [showDKImportModal, setShowDKImportModal] = useState(false);
  const [sortBy, setSortBy] = useState<"team" | "salary-high" | "salary-low">("team");

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
      if (teamFilter.length > 0 && !teamFilter.includes(p.team_name)) return false;
      if (positionFilter !== "all" && p.position !== positionFilter) return false;
      return true;
    });
  }, [players, teamFilter, positionFilter]);

  const toggleTeamFilter = (team: string) => {
    setTeamFilter((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const clearTeamFilter = () => setTeamFilter([]);

  // Group players by team (or flat list when sorting by salary)
  const playersByTeam = useMemo(() => {
    if (sortBy !== "team") {
      // For salary sorting, return a flat list under a single "key"
      const sorted = [...filteredPlayers].sort((a, b) => {
        const aSalary = a.dk_salary || 0;
        const bSalary = b.dk_salary || 0;
        return sortBy === "salary-high" ? bSalary - aSalary : aSalary - bSalary;
      });
      return { __all__: sorted };
    }
    
    const grouped: Record<string, SelectablePlayerV2[]> = {};
    for (const player of filteredPlayers) {
      if (!grouped[player.team_name]) {
        grouped[player.team_name] = [];
      }
      grouped[player.team_name].push(player);
    }
    return grouped;
  }, [filteredPlayers, sortBy]);

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

  const syncInjuryStatus = async () => {
    setSyncingInjuries(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-espn-injury-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Sync failed");
      }

      toast({
        title: "Injury sync complete",
        description: `${result.playersUpdated} players updated`,
      });

      if (result.playersUpdated > 0) {
        await loadPlayers();
      }
    } catch (error) {
      console.error("Error syncing injuries:", error);
      toast({
        title: "Error syncing injuries",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    setSyncingInjuries(false);
  };

  const markPlayerOut = async (playerId: string, isOut: boolean) => {
    setUpdatingPlayers((prev) => new Set(prev).add(playerId));
    
    const newStatus = isOut ? 'out' : 'active';
    const newOverride = isOut ? 'exclude' : 'auto';
    
    const { error } = await supabase
      .from("playoff_players")
      .update({ 
        injury_status: newStatus,
        selection_override: newOverride,
      })
      .eq("id", playerId);

    if (error) {
      toast({
        title: "Error updating player",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId
            ? { ...p, injury_status: newStatus as InjuryStatus, selection_override: newOverride, is_selectable: !isOut }
            : p
        )
      );
      toast({
        title: isOut ? "Player marked OUT" : "Player marked active",
      });
    }

    setUpdatingPlayers((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
  };

  const getStatusBadge = (player: SelectablePlayerV2) => {
    if (player.selection_override === "include") {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs">Included</Badge>;
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

  const getInjuryBadge = (status: InjuryStatus | null) => {
    if (!status || status === 'active') return null;
    
    const badges: Record<string, { label: string; className: string }> = {
      out: { label: "OUT", className: "bg-red-600 hover:bg-red-700 text-white" },
      ir: { label: "IR", className: "bg-red-800 hover:bg-red-900 text-white" },
      doubtful: { label: "D", className: "bg-orange-600 hover:bg-orange-700 text-white" },
      questionable: { label: "Q", className: "bg-amber-500 hover:bg-amber-600 text-black" },
      probable: { label: "P", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    };
    
    const badge = badges[status];
    if (!badge) return null;
    
    return (
      <Badge className={cn("text-xs font-bold", badge.className)}>
        {badge.label}
      </Badge>
    );
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                  {teamFilter.length === 0
                    ? "All Teams"
                    : teamFilter.length === 1
                    ? teamFilter[0]
                    : `${teamFilter.length} teams`}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-background border" align="start">
                <div className="p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={clearTeamFilter}
                  >
                    Clear selection
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {teams.map((team) => (
                    <div
                      key={team}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleTeamFilter(team)}
                    >
                      <Checkbox
                        checked={teamFilter.includes(team)}
                        onCheckedChange={() => toggleTeamFilter(team)}
                      />
                      <span className="flex-1 text-sm">{team}</span>
                      <span className="text-xs text-muted-foreground">
                        ({teamStats[team]?.included || 0})
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

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

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">By Team</SelectItem>
                <SelectItem value="salary-high">Salary (High)</SelectItem>
                <SelectItem value="salary-low">Salary (Low)</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={expandAll} disabled={sortBy !== "team"}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} disabled={sortBy !== "team"}>
              Collapse All
            </Button>
            <Button variant="secondary" size="sm" onClick={resetAllToAuto}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All to Auto
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncInjuryStatus}
              disabled={syncingInjuries}
            >
              {syncingInjuries ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Injuries
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDKImportModal(true)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Import DK Salaries
            </Button>

            <span className="text-sm text-muted-foreground self-center ml-auto">
              Showing {filteredPlayers.length} players
            </span>
          </div>

          {/* Players - grouped by team or flat list */}
          {sortBy === "team" ? (
            <div className="space-y-2">
              {Object.entries(playersByTeam)
                .filter(([key]) => key !== "__all__")
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([teamName, teamPlayers]) => (
                  <TeamSection
                    key={teamName}
                    teamName={teamName}
                    teamPlayers={teamPlayers}
                    isExpanded={expandedTeams.has(teamName)}
                    onToggle={() => toggleTeam(teamName)}
                    stats={teamStats[teamName]}
                    updatingPlayers={updatingPlayers}
                    onUpdateOverride={updatePlayerOverride}
                    onMarkOut={markPlayerOut}
                    getStatusBadge={getStatusBadge}
                    getInjuryBadge={getInjuryBadge}
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  All Players (sorted by salary {sortBy === "salary-high" ? "high to low" : "low to high"})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="space-y-2">
                  {(playersByTeam.__all__ || []).map((player) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      isUpdating={updatingPlayers.has(player.id)}
                      onUpdateOverride={updatePlayerOverride}
                      onMarkOut={markPlayerOut}
                      getStatusBadge={getStatusBadge}
                      getInjuryBadge={getInjuryBadge}
                      showTeam
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <DKSalaryImportModal
            open={showDKImportModal}
            onOpenChange={setShowDKImportModal}
            players={players}
            onImportComplete={loadPlayers}
          />
        </>
      )}
    </div>
  );
};

// TeamSection component for grouped view
interface TeamSectionProps {
  teamName: string;
  teamPlayers: SelectablePlayerV2[];
  isExpanded: boolean;
  onToggle: () => void;
  stats: { total: number; included: number } | undefined;
  updatingPlayers: Set<string>;
  onUpdateOverride: (id: string, override: SelectionOverride) => void;
  onMarkOut: (id: string, isOut: boolean) => void;
  getStatusBadge: (player: SelectablePlayerV2) => React.ReactNode;
  getInjuryBadge: (status: InjuryStatus | null) => React.ReactNode;
}

function TeamSection({
  teamName,
  teamPlayers,
  isExpanded,
  onToggle,
  stats,
  updatingPlayers,
  onUpdateOverride,
  onMarkOut,
  getStatusBadge,
  getInjuryBadge,
}: TeamSectionProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
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
                <PlayerRow
                  key={player.id}
                  player={player}
                  isUpdating={updatingPlayers.has(player.id)}
                  onUpdateOverride={onUpdateOverride}
                  onMarkOut={onMarkOut}
                  getStatusBadge={getStatusBadge}
                  getInjuryBadge={getInjuryBadge}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// PlayerRow component
interface PlayerRowProps {
  player: SelectablePlayerV2;
  isUpdating: boolean;
  onUpdateOverride: (id: string, override: SelectionOverride) => void;
  onMarkOut: (id: string, isOut: boolean) => void;
  getStatusBadge: (player: SelectablePlayerV2) => React.ReactNode;
  getInjuryBadge: (status: InjuryStatus | null) => React.ReactNode;
  showTeam?: boolean;
}

function PlayerRow({
  player,
  isUpdating,
  onUpdateOverride,
  onMarkOut,
  getStatusBadge,
  getInjuryBadge,
  showTeam,
}: PlayerRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border",
        player.is_selectable
          ? "bg-emerald-950/30 border-emerald-700"
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
        {showTeam && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {player.team_name}
          </span>
        )}
        <Badge variant="secondary" className="text-xs w-10 justify-center flex-shrink-0">
          {player.position}
        </Badge>
        <div className="w-12 flex-shrink-0">
          {player.depth_chart_label && (
            <Badge className="text-xs font-mono bg-emerald-600 hover:bg-emerald-700 w-full justify-center">
              {player.depth_chart_label}
            </Badge>
          )}
        </div>
        {/* DK Salary */}
        <div className="w-20 flex-shrink-0 text-right">
          {player.dk_salary ? (
            <div className="flex items-center justify-end gap-1">
              <span className="font-mono text-sm text-emerald-400">
                ${player.dk_salary.toLocaleString()}
              </span>
              {player.dk_salary_week && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  Wk{player.dk_salary_week}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
        {/* Injury Badge */}
        <div className="w-10 flex-shrink-0">
          {getInjuryBadge(player.injury_status)}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">{getStatusBadge(player)}</div>

      {/* Injury Status Action */}
      <div className="flex-shrink-0 w-24">
        {player.injury_status === "out" || player.injury_status === "ir" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 w-full border-emerald-600 text-emerald-500 hover:bg-emerald-900/30"
            onClick={() => onMarkOut(player.id, false)}
            disabled={isUpdating}
            title="Mark as Active"
          >
            <Check className="w-4 h-4 mr-1" />
            Activate
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 w-full border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => onMarkOut(player.id, true)}
            disabled={isUpdating}
            title="Mark as OUT"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Mark OUT
          </Button>
        )}
      </div>

      {/* Override Toggle */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant={player.selection_override === "include" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            player.selection_override === "include" && "bg-emerald-600 hover:bg-emerald-700"
          )}
          onClick={() => onUpdateOverride(player.id, "include")}
          disabled={isUpdating}
          title="Include"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant={player.selection_override === "auto" ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onUpdateOverride(player.id, "auto")}
          disabled={isUpdating}
          title="Auto"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant={player.selection_override === "exclude" ? "destructive" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onUpdateOverride(player.id, "exclude")}
          disabled={isUpdating}
          title="Exclude"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default AdminSelectablePlayers;

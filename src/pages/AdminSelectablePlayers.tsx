import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SelectablePlayer {
  id: string;
  player_id: number;
  name: string;
  position: string;
  team_name: string;
  team_id: number;
  image_url: string | null;
  depth_chart_slot: string;
  depth_chart_rank: number;
  is_starter: boolean;
  season: number;
}

const AdminSelectablePlayers = () => {
  const [players, setPlayers] = useState<SelectablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("selectable_playoff_players")
      .select("*")
      .order("team_name")
      .order("depth_chart_slot")
      .order("depth_chart_rank");

    if (error) {
      console.error("Error loading players:", error);
    } else {
      setPlayers(data as SelectablePlayer[]);
    }
    setLoading(false);
  };

  const teams = [...new Set(players.map((p) => p.team_name))].sort();
  const positions = [...new Set(players.map((p) => p.position))].sort();

  const filteredPlayers = players.filter((p) => {
    if (teamFilter !== "all" && p.team_name !== teamFilter) return false;
    if (positionFilter !== "all" && p.position !== positionFilter) return false;
    return true;
  });

  const teamCounts = teams.map((team) => ({
    team,
    count: players.filter((p) => p.team_name === team).length,
  }));

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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">With Headshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {players.filter((p) => p.image_url).length}/{players.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Players per Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {teamCounts.map(({ team, count }) => (
                  <div key={team} className="flex justify-between">
                    <span className="text-muted-foreground">{team}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
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

            <span className="text-sm text-muted-foreground self-center">
              Showing {filteredPlayers.length} players
            </span>
          </div>

          {/* Player Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Starter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        {player.image_url ? (
                          <img
                            src={player.image_url}
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            N/A
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.team_name}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell className="font-mono text-xs">{player.depth_chart_slot}</TableCell>
                      <TableCell>{player.depth_chart_rank}</TableCell>
                      <TableCell>
                        {player.is_starter ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminSelectablePlayers;

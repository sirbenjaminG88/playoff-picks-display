import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface PlayoffPlayer {
  id: string;
  player_id: number;
  name: string;
  position: string;
  team_name: string;
  team_id: number;
  season: number;
  number: string | null;
  image_url: string | null;
  group: string | null;
}

const POSITIONS = ["All", "QB", "RB", "WR", "TE"];
const PAGE_SIZE = 25;

const AdminPlayers = () => {
  const [players, setPlayers] = useState<PlayoffPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [teams, setTeams] = useState<string[]>([]);

  // Filters
  const [selectedSeason, setSelectedSeason] = useState<number>(2024);
  const [selectedPosition, setSelectedPosition] = useState<string>("All");
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch distinct seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from("playoff_players")
        .select("season")
        .order("season", { ascending: false });

      if (data) {
        const uniqueSeasons = [...new Set(data.map((d) => d.season))];
        setSeasons(uniqueSeasons);
        if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
          setSelectedSeason(uniqueSeasons[0]);
        }
      }
    };
    fetchSeasons();
  }, []);

  // Fetch teams for selected season
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase
        .from("playoff_players")
        .select("team_name")
        .eq("season", selectedSeason)
        .order("team_name");

      if (data) {
        const uniqueTeams = [...new Set(data.map((d) => d.team_name))];
        setTeams(uniqueTeams);
      }
    };
    fetchTeams();
  }, [selectedSeason]);

  // Fetch players based on filters
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);

      let query = supabase
        .from("playoff_players")
        .select("*")
        .eq("season", selectedSeason)
        .order("team_name")
        .order("position")
        .order("name");

      if (selectedPosition !== "All") {
        query = query.eq("position", selectedPosition);
      }

      if (selectedTeam !== "All") {
        query = query.eq("team_name", selectedTeam);
      }

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching players:", error);
      } else {
        setPlayers(data || []);
      }
      setLoading(false);
    };

    fetchPlayers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedSeason, selectedPosition, selectedTeam, searchQuery]);

  // Position breakdown for current filters
  const positionBreakdown = useMemo(() => {
    return {
      QB: players.filter((p) => p.position === "QB").length,
      RB: players.filter((p) => p.position === "RB").length,
      WR: players.filter((p) => p.position === "WR").length,
      TE: players.filter((p) => p.position === "TE").length,
    };
  }, [players]);

  // Pagination
  const totalPages = Math.ceil(players.length / PAGE_SIZE);
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return players.slice(start, start + PAGE_SIZE);
  }, [players, currentPage]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header with back link */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Playoff Players</h1>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Player Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-3xl font-bold">{players.length}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{positionBreakdown.QB}</div>
                <div className="text-xs text-muted-foreground">QB</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{positionBreakdown.RB}</div>
                <div className="text-xs text-muted-foreground">RB</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{positionBreakdown.WR}</div>
                <div className="text-xs text-muted-foreground">WR</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{positionBreakdown.TE}</div>
                <div className="text-xs text-muted-foreground">TE</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Season Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Season</label>
              <Select
                value={selectedSeason.toString()}
                onValueChange={(value) => setSelectedSeason(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season} value={season.toString()}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Position</label>
              <Select
                value={selectedPosition}
                onValueChange={setSelectedPosition}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Team</label>
              <Select
                value={selectedTeam}
                onValueChange={setSelectedTeam}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No players found</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Player ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-20">Position</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="w-20">Team ID</TableHead>
                      <TableHead className="w-20">Season</TableHead>
                      <TableHead className="w-20">Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-mono text-sm">{player.player_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {player.image_url && (
                              <img
                                src={player.image_url}
                                alt={player.name}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                            <span className="font-medium">{player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              player.position === "QB"
                                ? "bg-blue-500/20 text-blue-500"
                                : player.position === "RB"
                                ? "bg-green-500/20 text-green-500"
                                : player.position === "WR"
                                ? "bg-orange-500/20 text-orange-500"
                                : "bg-purple-500/20 text-purple-500"
                            }`}
                          >
                            {player.position}
                          </span>
                        </TableCell>
                        <TableCell>{player.team_name}</TableCell>
                        <TableCell className="font-mono text-sm">{player.team_id}</TableCell>
                        <TableCell>{player.season}</TableCell>
                        <TableCell>{player.number || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
                    {Math.min(currentPage * PAGE_SIZE, players.length)} of {players.length} players
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPlayers;

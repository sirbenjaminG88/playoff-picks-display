import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Users, Calendar, UserCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Admin = () => {
  const { toast } = useToast();
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isLoadingRegSeasonPlayers, setIsLoadingRegSeasonPlayers] = useState(false);
  const [regSeasonSyncStartTime, setRegSeasonSyncStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [teamsResult, setTeamsResult] = useState<any>(null);
  const [playersResult, setPlayersResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [gamesResult, setGamesResult] = useState<any>(null);
  const [regSeasonPlayersResult, setRegSeasonPlayersResult] = useState<any>(null);

  // Timer for sync progress
  useEffect(() => {
    if (!isLoadingRegSeasonPlayers || !regSeasonSyncStartTime) {
      setElapsedSeconds(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - regSeasonSyncStartTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isLoadingRegSeasonPlayers, regSeasonSyncStartTime]);

  const syncPlayoffTeams = async () => {
    setIsLoadingTeams(true);
    setTeamsResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-playoff-teams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Synced ${data.teamsSynced} playoff teams from ${data.gamesFound} games.`,
        });
        setTeamsResult(data);
      } else {
        throw new Error(data.error || 'Failed to sync teams');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync playoff teams",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const syncPlayoffPlayers = async () => {
    setIsLoadingPlayers(true);
    setPlayersResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-playoff-players`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Synced ${data.playersSynced} playoff players from ${data.teamsProcessed} teams.`,
        });
        setPlayersResult(data);
      } else {
        throw new Error(data.error || 'Failed to sync players');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync playoff players",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const testPlayoffTeamPlayers = async () => {
    setIsLoadingTest(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-playoff-team-players`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Test Successful!",
          description: `Found ${data.total_players} players for team ${data.team_id}`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
      
      setTestResult(data);
    } catch (error) {
      const errorData = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test players endpoint"
      };
      setTestResult(errorData);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to test players endpoint",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTest(false);
    }
  };

  const syncPlayoffGames = async () => {
    setIsLoadingGames(true);
    setGamesResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-playoff-games`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Synced ${data.inserted + data.updated} playoff games (${data.inserted} new, ${data.updated} updated).`,
        });
        setGamesResult(data);
      } else {
        throw new Error(data.error || 'Failed to sync games');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync playoff games",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGames(false);
    }
  };

  const syncRegSeasonPlayers = async () => {
    setIsLoadingRegSeasonPlayers(true);
    setRegSeasonPlayersResult(null);
    setRegSeasonSyncStartTime(Date.now());

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-season-players`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ season: 2025 }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Synced ${data.playersUpserted} regular season players from ${data.totalTeams} teams.`,
        });
        setRegSeasonPlayersResult(data);
      } else {
        throw new Error(data.error || 'Failed to sync regular season players');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync regular season players",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRegSeasonPlayers(false);
      setRegSeasonSyncStartTime(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Users & Leagues
            </Button>
          </Link>
          <Link to="/admin/players">
            <Button variant="outline">
              <UserCircle className="w-4 h-4 mr-2" />
              Browse Players
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sync 2024 NFL Playoff Teams</CardTitle>
            <CardDescription>
              Fetch all 2024 NFL postseason games from API-Sports and extract playoff teams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncPlayoffTeams} 
              disabled={isLoadingTeams}
              size="lg"
            >
              {isLoadingTeams ? "Syncing..." : "Sync Playoff Teams"}
            </Button>

            {teamsResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Sync Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Games Found: {teamsResult.gamesFound}</li>
                  <li>Teams Extracted: {teamsResult.teamsExtracted}</li>
                  <li>Teams Synced: {teamsResult.teamsSynced}</li>
                </ul>
                
                {teamsResult.teams && teamsResult.teams.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Playoff Teams:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {teamsResult.teams.map((team: any) => (
                        <div key={team.team_id} className="flex items-center gap-2 p-2 bg-background rounded">
                          {team.logo_url && (
                            <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
                          )}
                          <span className="text-xs">{team.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync 2024 NFL Playoff Players</CardTitle>
            <CardDescription>
              Fetch all QB, RB, WR, and TE players from playoff teams using API-Sports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncPlayoffPlayers} 
              disabled={isLoadingPlayers}
              size="lg"
            >
              {isLoadingPlayers ? "Syncing..." : "Sync Playoff Players"}
            </Button>

            {playersResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Sync Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Teams Processed: {playersResult.teamsProcessed}</li>
                  <li>Players Synced: {playersResult.playersSynced}</li>
                </ul>
                
                {playersResult.positionBreakdown && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Position Breakdown:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="p-2 bg-background rounded text-center">
                        <div className="text-2xl font-bold">{playersResult.positionBreakdown.QB}</div>
                        <div className="text-xs text-muted-foreground">Quarterbacks</div>
                      </div>
                      <div className="p-2 bg-background rounded text-center">
                        <div className="text-2xl font-bold">{playersResult.positionBreakdown.RB}</div>
                        <div className="text-xs text-muted-foreground">Running Backs</div>
                      </div>
                      <div className="p-2 bg-background rounded text-center">
                        <div className="text-2xl font-bold">{playersResult.positionBreakdown.WR}</div>
                        <div className="text-xs text-muted-foreground">Wide Receivers</div>
                      </div>
                      <div className="p-2 bg-background rounded text-center">
                        <div className="text-2xl font-bold">{playersResult.positionBreakdown.TE}</div>
                        <div className="text-xs text-muted-foreground">Tight Ends</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Test API-Sports Players Endpoint</CardTitle>
            <CardDescription>
              Test fetching players for Houston Texans (team_id: 26) to diagnose API response
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testPlayoffTeamPlayers} 
              disabled={isLoadingTest}
              size="lg"
              variant="secondary"
            >
              {isLoadingTest ? "Testing..." : "Test Playoff Team Players (team_id 26)"}
            </Button>

            {testResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Test Results:</h3>
                <pre className="text-xs overflow-auto max-h-96 bg-background p-4 rounded border">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Sync 2024 NFL Playoff Schedule
            </CardTitle>
            <CardDescription>
              Fetch all playoff games from API-Sports and store them for stats lookup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncPlayoffGames} 
              disabled={isLoadingGames}
              size="lg"
            >
              {isLoadingGames ? "Syncing..." : "Sync Playoff Games"}
            </Button>

            {gamesResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Sync Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Total Games from API: {gamesResult.totalGamesFromApi}</li>
                  <li>Games Inserted: {gamesResult.inserted}</li>
                  <li>Games Updated: {gamesResult.updated}</li>
                  <li>Games Skipped: {gamesResult.skipped}</li>
                </ul>
                
                {gamesResult.skippedGames && gamesResult.skippedGames.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-muted-foreground">Skipped Games:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {gamesResult.skippedGames.map((game: string, idx: number) => (
                        <li key={idx}>{game}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Sync 2025 Regular Season Players
            </CardTitle>
            <CardDescription>
              Fetch all QB, RB, WR, and TE players for the 2025 regular season from API-Sports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncRegSeasonPlayers} 
              disabled={isLoadingRegSeasonPlayers}
              size="lg"
            >
              {isLoadingRegSeasonPlayers ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : "Sync Regular Season Players"}
            </Button>

            {isLoadingRegSeasonPlayers && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing 34 NFL teams...</span>
                  <span className="font-mono">{Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
                </div>
                <Progress value={Math.min((elapsedSeconds / 150) * 100, 95)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Estimated time: ~2-3 minutes (fetching player rosters and photos from API)
                </p>
              </div>
            )}

            {regSeasonPlayersResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Sync Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Teams Processed: {regSeasonPlayersResult.totalTeams}</li>
                  <li>Total Players Fetched: {regSeasonPlayersResult.totalPlayersFetched}</li>
                  <li>Offensive Players Found: {regSeasonPlayersResult.offensivePlayersFound}</li>
                  <li>Players Upserted: {regSeasonPlayersResult.playersUpserted}</li>
                </ul>
                
                {regSeasonPlayersResult.errors && regSeasonPlayersResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-destructive">Errors:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {regSeasonPlayersResult.errors.slice(0, 5).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;

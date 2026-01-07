import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Users, Calendar, UserCircle, Loader2, Download, CheckCircle, AlertTriangle, Search, X, FileImage } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImageReviewCard } from "@/components/admin/ImageReviewCard";

// Helper to get auth headers for admin edge function calls
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
}

interface ConsistencyStats {
  total_players: number;
  status_ok: number;
  status_placeholder: number;
  status_no_url: number;
  status_unknown: number;
  mismatch_has_headshot_true_but_not_ok: number;
  mismatch_has_headshot_false_but_ok: number;
}

const Admin = () => {
  const { toast } = useToast();
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isLoadingWildCard, setIsLoadingWildCard] = useState(false);
  const [isLoadingRegSeasonPlayers, setIsLoadingRegSeasonPlayers] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [regSeasonSyncStartTime, setRegSeasonSyncStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [teamsResult, setTeamsResult] = useState<any>(null);
  const [playersResult, setPlayersResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [gamesResult, setGamesResult] = useState<any>(null);
  const [wildCardResult, setWildCardResult] = useState<any>(null);
  const [regSeasonPlayersResult, setRegSeasonPlayersResult] = useState<any>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  
  // Consistency check state
  const [consistencyStats, setConsistencyStats] = useState<ConsistencyStats | null>(null);
  const [isLoadingConsistency, setIsLoadingConsistency] = useState(false);
  
  // ZIP export state
  const [exportFilterType, setExportFilterType] = useState<'status' | 'has_headshot'>('status');
  const [exportStatus, setExportStatus] = useState<string>('ok');
  const [exportHasHeadshot, setExportHasHeadshot] = useState<boolean>(true);
  const [exportLimit, setExportLimit] = useState<number>(100);
  const [isExporting, setIsExporting] = useState(false);

  // ESPN headshot test state
  const [espnTestModalOpen, setEspnTestModalOpen] = useState(false);
  const [espnTestInput, setEspnTestInput] = useState('');
  const [espnTestLoading, setEspnTestLoading] = useState(false);
  const [espnTestResults, setEspnTestResults] = useState<any[] | null>(null);

  // Headshot points sync state
  const [isLoadingHeadshotPoints, setIsLoadingHeadshotPoints] = useState(false);
  const [headshotPointsResult, setHeadshotPointsResult] = useState<any>(null);

  // AI Image audit state
  const [isLoadingImageAudit, setIsLoadingImageAudit] = useState(false);
  const [imageAuditResult, setImageAuditResult] = useState<any>(null);
  const [imageAuditLimit, setImageAuditLimit] = useState(10);

  // Sync Regular Season Stats state
  const [isLoadingRegSeasonStats, setIsLoadingRegSeasonStats] = useState(false);
  const [regSeasonStatsResult, setRegSeasonStatsResult] = useState<any>(null);
  const [regSeasonStatsWeek, setRegSeasonStatsWeek] = useState(18);
  const [imageAuditOffset, setImageAuditOffset] = useState(0);

  // Copy ESPN headshots to playoffs state
  const [isLoadingCopyEspn, setIsLoadingCopyEspn] = useState(false);
  const [copyEspnResult, setCopyEspnResult] = useState<any>(null);

  // Load consistency stats on mount
  useEffect(() => {
    loadConsistencyStats();
  }, []);

  const loadConsistencyStats = async () => {
    setIsLoadingConsistency(true);
    try {
      // Get total players count
      const { count: total_players } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense');

      // Get status counts
      const { count: status_ok } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .eq('headshot_status', 'ok');

      const { count: status_placeholder } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .eq('headshot_status', 'placeholder');

      const { count: status_no_url } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .eq('headshot_status', 'no_url');

      const { count: status_unknown } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .eq('headshot_status', 'unknown');

      // Get mismatch counts
      const { count: mismatch_true_not_ok } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .eq('has_headshot', true)
        .neq('headshot_status', 'ok');

      const { count: mismatch_false_ok } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('season', 2025)
        .eq('group', 'Offense')
        .eq('has_headshot', false)
        .eq('headshot_status', 'ok');

      setConsistencyStats({
        total_players: total_players || 0,
        status_ok: status_ok || 0,
        status_placeholder: status_placeholder || 0,
        status_no_url: status_no_url || 0,
        status_unknown: status_unknown || 0,
        mismatch_has_headshot_true_but_not_ok: mismatch_true_not_ok || 0,
        mismatch_has_headshot_false_but_ok: mismatch_false_ok || 0,
      });
    } catch (error) {
      console.error('Error loading consistency stats:', error);
      toast({
        title: "Error",
        description: "Failed to load consistency stats",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConsistency(false);
    }
  };

  const downloadHeadshotSample = async () => {
    setIsExporting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-player-headshots`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(
            exportFilterType === 'status' 
              ? { status: exportStatus, limit: exportLimit }
              : { has_headshot: exportHasHeadshot, limit: exportLimit }
          ),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Get blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = exportFilterType === 'status' 
        ? `${exportStatus}-headshots-sample.zip`
        : `has_headshot_${exportHasHeadshot}-headshots-sample.zip`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${exportFilterType === 'status' ? exportStatus : `has_headshot=${exportHasHeadshot}`} headshots sample`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download headshots",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-playoff-teams`,
        {
          method: 'POST',
          headers,
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
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-playoff-players`,
        {
          method: 'POST',
          headers,
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

  const copyEspnHeadshotsToPlayoffs = async () => {
    setIsLoadingCopyEspn(true);
    setCopyEspnResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copy-espn-headshots-to-playoffs`,
        {
          method: 'POST',
          headers,
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Copied ${data.updated} ESPN headshots to playoff players.`,
        });
        setCopyEspnResult(data);
      } else {
        throw new Error(data.error || 'Failed to copy ESPN headshots');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to copy ESPN headshots",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCopyEspn(false);
    }
  };

  const testPlayoffTeamPlayers = async () => {
    setIsLoadingTest(true);
    setTestResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-playoff-team-players`,
        {
          method: 'POST',
          headers,
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
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-2025-playoff-schedule`,
        {
          method: 'POST',
          headers,
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

  const insertWildCard = async () => {
    setIsLoadingWildCard(true);
    setWildCardResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/insert-2025-wild-card`,
        {
          method: 'POST',
          headers,
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Inserted ${data.teamsInserted} teams and ${data.gamesInserted} Wild Card games!`,
        });
        setWildCardResult(data);
      } else {
        throw new Error(data.error || 'Failed to insert Wild Card data');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to insert Wild Card data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWildCard(false);
    }
  };

  const syncRegSeasonPlayers = async () => {
    setIsLoadingRegSeasonPlayers(true);
    setRegSeasonPlayersResult(null);
    setRegSeasonSyncStartTime(Date.now());

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-season-players`,
        {
          method: 'POST',
          headers,
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

  const auditPlayerHeadshots = async () => {
    setIsLoadingAudit(true);
    setAuditResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-player-headshots`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ limit: 100 }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Audit Complete",
          description: `Processed ${data.processed}: ${data.markedOk} real, ${data.markedPlaceholder} placeholder. ${data.remainingUnknown} remaining.`,
        });
        setAuditResult(data);
      } else {
        throw new Error(data.error || 'Failed to audit headshots');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to audit player headshots",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const testEspnHeadshots = async () => {
    const names = espnTestInput
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      toast({
        title: "No names",
        description: "Please enter at least one player name",
        variant: "destructive",
      });
      return;
    }

    setEspnTestLoading(true);
    setEspnTestResults(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-espn-headshots`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ playerNames: names }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Test Complete",
          description: `Found ${data.found}/${data.totalProcessed} ESPN headshots`,
        });
        setEspnTestResults(data.results);
      } else {
        throw new Error(data.error || 'Failed to test ESPN headshots');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to test ESPN headshots",
        variant: "destructive",
      });
    } finally {
      setEspnTestLoading(false);
    }
  };

  const syncHeadshotPointsFromScreenshots = async () => {
    setIsLoadingHeadshotPoints(true);
    setHeadshotPointsResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-headshot-points-from-screenshots`,
        {
          method: 'POST',
          headers,
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Extracted ${data.summary.totalPlayersExtracted} players, updated ${data.summary.playersUpdated} in database.`,
        });
        setHeadshotPointsResult(data);
      } else {
        throw new Error(data.error || 'Failed to sync headshot points');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync headshot points",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHeadshotPoints(false);
    }
  };

  const auditPlayerImagesWithAI = async () => {
    setIsLoadingImageAudit(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-player-images`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            limit: imageAuditLimit, 
            offset: imageAuditOffset,
            onlyEspn: true 
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "AI Audit Complete",
          description: `Audited ${data.summary.total} players: ${data.summary.verified} verified, ${data.summary.mismatches} flagged.`,
        });
        setImageAuditResult(data);
      } else {
        throw new Error(data.error || 'Failed to audit player images');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to audit player images",
        variant: "destructive",
      });
    } finally {
      setIsLoadingImageAudit(false);
    }
  };

  const syncRegularSeasonStats = async () => {
    setIsLoadingRegSeasonStats(true);
    setRegSeasonStatsResult(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-live-stats?week=${regSeasonStatsWeek}&force=true`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Stats Synced!",
          description: `Synced ${data.playersProcessed} players for week ${regSeasonStatsWeek}.`,
        });
        setRegSeasonStatsResult(data);
      } else if (data.reason === 'no_active_games') {
        toast({
          title: "No Active Games",
          description: data.message,
        });
        setRegSeasonStatsResult(data);
      } else {
        throw new Error(data.error || 'Failed to sync stats');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync regular season stats",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRegSeasonStats(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex gap-2 flex-wrap">
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
          <Link to="/admin/selectable-players">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Selectable Players
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Manual Image Review - Top Priority */}
        <ImageReviewCard />

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
              Sync 2025 NFL Playoff Schedule
            </CardTitle>
            <CardDescription>
              Fetch all playoff games from API-Sports and store them for stats lookup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={insertWildCard} 
                disabled={isLoadingWildCard}
                size="lg"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoadingWildCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Inserting...
                  </>
                ) : "🚨 Insert Wild Card (Manual)"}
              </Button>
              <Button 
                onClick={syncPlayoffGames} 
                disabled={isLoadingGames}
                size="lg"
                variant="secondary"
              >
                {isLoadingGames ? "Syncing..." : "Sync Playoff Schedule (API)"}
              </Button>
              <Button 
                onClick={syncPlayoffPlayers} 
                disabled={isLoadingPlayers}
                size="lg"
                variant="secondary"
              >
                {isLoadingPlayers ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : "Sync Playoff Players"}
              </Button>
              <Button 
                onClick={copyEspnHeadshotsToPlayoffs} 
                disabled={isLoadingCopyEspn}
                size="lg"
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                {isLoadingCopyEspn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : "📷 Copy ESPN Headshots"}
              </Button>
            </div>

            {copyEspnResult && (
              <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-500">
                <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">📷 ESPN Headshot Copy Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Total Playoff Players: {copyEspnResult.totalPlayoffPlayers}</li>
                  <li>ESPN Players Available: {copyEspnResult.espnPlayersAvailable}</li>
                  <li className="font-bold text-green-600">Updated: {copyEspnResult.updated}</li>
                  <li>Already Had ESPN: {copyEspnResult.alreadyHadEspn}</li>
                  <li>No ESPN Match: {copyEspnResult.skipped}</li>
                </ul>
              </div>
            )}

            {wildCardResult && (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-500">
                <h3 className="font-semibold mb-2 text-green-700 dark:text-green-400">✅ Wild Card Insert Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Teams Inserted: {wildCardResult.teamsInserted}</li>
                  <li>Games Inserted: {wildCardResult.gamesInserted}</li>
                  <li>Games Updated with UUIDs: {wildCardResult.gamesUpdatedWithUUIDs}</li>
                </ul>
              </div>
            )}

            {gamesResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">API Sync Results:</h3>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Sync Regular Season Stats
            </CardTitle>
            <CardDescription>
              Manually sync player stats for a specific week from API-Sports (force sync bypasses game window check)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Week to Sync</Label>
              <div className="flex flex-wrap gap-2">
                {[14, 15, 16, 17, 18].map((week) => (
                  <Button
                    key={week}
                    variant={regSeasonStatsWeek === week ? "default" : "outline"}
                    onClick={() => setRegSeasonStatsWeek(week)}
                    disabled={isLoadingRegSeasonStats}
                    size="sm"
                  >
                    Week {week}
                  </Button>
                ))}
              </div>
            </div>
            <Button 
              onClick={syncRegularSeasonStats} 
              disabled={isLoadingRegSeasonStats}
              size="lg"
              className="w-full"
            >
              {isLoadingRegSeasonStats ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing Week {regSeasonStatsWeek}...
                </>
              ) : `Force Sync Week ${regSeasonStatsWeek} Stats`}
            </Button>

            {regSeasonStatsResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Sync Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Week: {regSeasonStatsResult.week}</li>
                  <li>Players Processed: {regSeasonStatsResult.playersProcessed || 0}</li>
                  {regSeasonStatsResult.playersUpdated !== undefined && (
                    <li>Players Updated: {regSeasonStatsResult.playersUpdated}</li>
                  )}
                  {regSeasonStatsResult.reason && (
                    <li className="text-muted-foreground">Reason: {regSeasonStatsResult.reason}</li>
                  )}
                  {regSeasonStatsResult.message && (
                    <li className="text-muted-foreground">{regSeasonStatsResult.message}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Audit Player Headshots
            </CardTitle>
            <CardDescription>
              Classify player image URLs as real headshots or placeholders (does NOT modify image_url)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={auditPlayerHeadshots} 
              disabled={isLoadingAudit}
              size="lg"
              variant="secondary"
            >
              {isLoadingAudit ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Auditing...
                </>
              ) : "Audit Player Headshots"}
            </Button>

            {auditResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Audit Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Players Processed: {auditResult.processed}</li>
                  <li className="text-green-500">Real Headshots: {auditResult.markedOk}</li>
                  <li className="text-yellow-500">Placeholders: {auditResult.markedPlaceholder}</li>
                  {auditResult.fetchErrors > 0 && (
                    <li className="text-destructive">Fetch Errors: {auditResult.fetchErrors}</li>
                  )}
                  <li className="text-muted-foreground">Remaining to Audit: {auditResult.remainingUnknown}</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Run again to process more players (batched at 100 per run with hash detection)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Headshot Consistency Check
            </CardTitle>
            <CardDescription>
              Verify that has_headshot matches headshot_status for 2025 Offense players
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={loadConsistencyStats} 
              disabled={isLoadingConsistency}
              variant="outline"
              size="sm"
            >
              {isLoadingConsistency ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : "Refresh Stats"}
            </Button>

            {consistencyStats && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold mb-2">Status Breakdown:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Total players: {consistencyStats.total_players}</li>
                  <li className="text-green-500">Status = ok: {consistencyStats.status_ok}</li>
                  <li className="text-yellow-500">Status = placeholder: {consistencyStats.status_placeholder}</li>
                  <li className="text-muted-foreground">Status = no_url: {consistencyStats.status_no_url}</li>
                  <li className="text-muted-foreground">Status = unknown: {consistencyStats.status_unknown}</li>
                </ul>
                
                <div className="border-t border-border pt-3 mt-3">
                  <h4 className="font-semibold mb-2">Mismatch Detection:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className={consistencyStats.mismatch_has_headshot_true_but_not_ok > 0 ? "text-destructive" : "text-muted-foreground"}>
                      🔴 has_headshot = TRUE but status ≠ 'ok': {consistencyStats.mismatch_has_headshot_true_but_not_ok}
                    </li>
                    <li className={consistencyStats.mismatch_has_headshot_false_but_ok > 0 ? "text-destructive" : "text-muted-foreground"}>
                      🔴 has_headshot = FALSE but status = 'ok': {consistencyStats.mismatch_has_headshot_false_but_ok}
                    </li>
                  </ul>
                  
                  {consistencyStats.mismatch_has_headshot_true_but_not_ok === 0 && 
                   consistencyStats.mismatch_has_headshot_false_but_ok === 0 ? (
                    <div className="flex items-center gap-2 mt-3 text-green-500 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Looks consistent ✅
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-3 text-yellow-500 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Inconsistent values detected ⚠️
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <h4 className="font-semibold mb-3">Download Sample for Review:</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="w-40">
                        <Label htmlFor="export-filter-type" className="text-xs text-muted-foreground">Filter By</Label>
                        <Select value={exportFilterType} onValueChange={(v) => setExportFilterType(v as 'status' | 'has_headshot')}>
                          <SelectTrigger id="export-filter-type" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="status">headshot_status</SelectItem>
                            <SelectItem value="has_headshot">has_headshot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {exportFilterType === 'status' ? (
                        <div className="flex-1">
                          <Label htmlFor="export-status" className="text-xs text-muted-foreground">Status Value</Label>
                          <Select value={exportStatus} onValueChange={setExportStatus}>
                            <SelectTrigger id="export-status" className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ok">Real headshots (status = ok)</SelectItem>
                              <SelectItem value="placeholder">Placeholders (status = placeholder)</SelectItem>
                              <SelectItem value="no_url">No URL (status = no_url)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <Label htmlFor="export-has-headshot" className="text-xs text-muted-foreground">has_headshot Value</Label>
                          <Select value={exportHasHeadshot.toString()} onValueChange={(v) => setExportHasHeadshot(v === 'true')}>
                            <SelectTrigger id="export-has-headshot" className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">has_headshot = TRUE</SelectItem>
                              <SelectItem value="false">has_headshot = FALSE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="w-28">
                        <Label htmlFor="export-limit" className="text-xs text-muted-foreground">Limit</Label>
                        <Input
                          id="export-limit"
                          type="number"
                          value={exportLimit}
                          onChange={(e) => setExportLimit(Math.max(1, parseInt(e.target.value) || 100))}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={downloadHeadshotSample}
                    disabled={isExporting}
                    className="mt-3"
                    variant="secondary"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Headshot Sample (.zip)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Test ESPN Headshot Lookup
            </CardTitle>
            <CardDescription>
              Search ESPN for player headshots by name (test only, no database changes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setEspnTestModalOpen(true)} variant="secondary">
              <Search className="w-4 h-4 mr-2" />
              Open ESPN Headshot Tester
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Sync Headshot Points from Screenshots
            </CardTitle>
            <CardDescription>
              Parse NFL Fantasy scoring leader screenshots and update players.points_for_headshot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={syncHeadshotPointsFromScreenshots} 
              disabled={isLoadingHeadshotPoints}
              size="lg"
            >
              {isLoadingHeadshotPoints ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Screenshots...
                </>
              ) : "Sync Headshot Points"}
            </Button>

            {headshotPointsResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold mb-2">Sync Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Files Processed: {headshotPointsResult.summary.filesProcessed}</li>
                  <li>Files with Errors: {headshotPointsResult.summary.filesWithErrors}</li>
                  <li>Players Extracted: {headshotPointsResult.summary.totalPlayersExtracted}</li>
                  <li className="text-green-500">Players Updated: {headshotPointsResult.summary.playersUpdated}</li>
                  <li className="text-yellow-500">Unmatched Players: {headshotPointsResult.summary.unmatchedCount}</li>
                </ul>
                
                {headshotPointsResult.details?.updatedPlayers?.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-sm mb-2">Updated Players (first 20):</h4>
                    <div className="max-h-40 overflow-y-auto text-xs bg-background p-2 rounded">
                      {headshotPointsResult.details.updatedPlayers.map((p: string, i: number) => (
                        <div key={i}>{p}</div>
                      ))}
                    </div>
                  </div>
                )}

                {headshotPointsResult.details?.unmatchedPlayers?.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-sm mb-2 text-yellow-500">Unmatched Players:</h4>
                    <div className="max-h-40 overflow-y-auto text-xs bg-background p-2 rounded">
                      {headshotPointsResult.details.unmatchedPlayers.map((p: string, i: number) => (
                        <div key={i}>{p}</div>
                      ))}
                    </div>
                  </div>
                )}

                {headshotPointsResult.details?.parseResults?.filter((r: any) => r.error)?.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-sm mb-2 text-destructive">Parse Errors:</h4>
                    <div className="max-h-40 overflow-y-auto text-xs bg-background p-2 rounded">
                      {headshotPointsResult.details.parseResults
                        .filter((r: any) => r.error)
                        .map((r: any, i: number) => (
                          <div key={i}>{r.fileName}: {r.error}</div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Image Quality Audit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              AI Image Quality Audit
            </CardTitle>
            <CardDescription>
              Use AI vision to verify player headshots are real photos of the correct players
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="w-24">
                <Label htmlFor="audit-limit" className="text-xs text-muted-foreground">Batch Size</Label>
                <Input
                  id="audit-limit"
                  type="number"
                  value={imageAuditLimit}
                  onChange={(e) => setImageAuditLimit(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                  min={1}
                  max={50}
                  className="mt-1"
                />
              </div>
              <div className="w-24">
                <Label htmlFor="audit-offset" className="text-xs text-muted-foreground">Start From</Label>
                <Input
                  id="audit-offset"
                  type="number"
                  value={imageAuditOffset}
                  onChange={(e) => setImageAuditOffset(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={auditPlayerImagesWithAI} 
                disabled={isLoadingImageAudit}
                size="lg"
              >
                {isLoadingImageAudit ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : "Run AI Audit"}
              </Button>
            </div>

            {isLoadingImageAudit && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Analyzing players {imageAuditOffset + 1} - {imageAuditOffset + imageAuditLimit}...
                  </span>
                  <span className="text-muted-foreground">~{imageAuditLimit * 2}s estimated</span>
                </div>
                <Progress value={undefined} className="h-2 animate-pulse" />
                <p className="text-xs text-muted-foreground">
                  AI is checking each image for jersey numbers, team colors, and photo authenticity
                </p>
              </div>
            )}

            {imageAuditResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold mb-2">Audit Summary:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2 bg-background rounded text-center">
                    <div className="text-2xl font-bold">{imageAuditResult.summary.total}</div>
                    <div className="text-xs text-muted-foreground">Total Audited</div>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded text-center">
                    <div className="text-2xl font-bold text-green-500">{imageAuditResult.summary.verified}</div>
                    <div className="text-xs text-muted-foreground">Verified</div>
                  </div>
                  <div className="p-2 bg-yellow-500/10 rounded text-center">
                    <div className="text-2xl font-bold text-yellow-500">{imageAuditResult.summary.mismatches}</div>
                    <div className="text-xs text-muted-foreground">Flagged</div>
                  </div>
                  <div className="p-2 bg-destructive/10 rounded text-center">
                    <div className="text-2xl font-bold text-destructive">{imageAuditResult.summary.errors}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                </div>

                {imageAuditResult.flagged?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2 text-yellow-500">Flagged Players ({imageAuditResult.flagged.length}):</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {imageAuditResult.flagged.map((player: any, i: number) => (
                        <div key={i} className="p-3 bg-background rounded border border-yellow-500/30">
                          <div className="flex items-start gap-3">
                            {player.image_url && (
                              <img 
                                src={player.image_url} 
                                alt={player.full_name} 
                                className="w-12 h-12 rounded object-cover bg-muted"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-semibold">{player.full_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {player.team_abbr} • #{player.jersey_number || 'N/A'}
                              </div>
                              <div className="mt-1 text-xs text-yellow-500">
                                {player.mismatch_reasons?.join(' • ')}
                              </div>
                              {player.ai_analysis && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  AI: Jersey #{player.ai_analysis.detected_jersey || 'N/A'} • 
                                  Colors: {player.ai_analysis.detected_team_colors || 'N/A'} • 
                                  Confidence: {player.ai_analysis.confidence || 'N/A'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setImageAuditOffset(imageAuditOffset + imageAuditLimit)}
                  className="mt-2"
                >
                  Audit Next Batch (offset: {imageAuditOffset + imageAuditLimit})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ESPN Headshot Test Modal */}
      <Dialog open={espnTestModalOpen} onOpenChange={setEspnTestModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test ESPN Headshot Lookup</DialogTitle>
            <DialogDescription>
              Enter player names (one per line) to search ESPN and verify headshot availability
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="player-names">Player Names (one per line)</Label>
              <Textarea
                id="player-names"
                placeholder="Jahmyr Gibbs&#10;Marvin Harrison Jr&#10;Amon-Ra St. Brown"
                value={espnTestInput}
                onChange={(e) => setEspnTestInput(e.target.value)}
                className="mt-1 h-40 font-mono text-sm"
              />
            </div>
            
            <Button onClick={testEspnHeadshots} disabled={espnTestLoading}>
              {espnTestLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Test ESPN Lookup
                </>
              )}
            </Button>
            
            {espnTestResults && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Results ({espnTestResults.filter(r => r.found).length}/{espnTestResults.length} found)</h4>
                  <Button variant="ghost" size="sm" onClick={() => setEspnTestResults(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Player Name</TableHead>
                        <TableHead className="w-[80px]">Found</TableHead>
                        <TableHead className="w-[100px]">ESPN ID</TableHead>
                        <TableHead className="w-[100px]">Image Size</TableHead>
                        <TableHead className="w-[80px]">Preview</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {espnTestResults.map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{result.name}</TableCell>
                          <TableCell>
                            <span className={result.found ? "text-green-500" : "text-red-500"}>
                              {result.found ? "✓ Yes" : "✗ No"}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {result.espnId || "—"}
                          </TableCell>
                          <TableCell>
                            {result.imageBytes > 0 
                              ? `${(result.imageBytes / 1024).toFixed(1)} KB` 
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {result.found && result.headshotUrl && (
                              <img 
                                src={result.headshotUrl} 
                                alt={result.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {result.error || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;

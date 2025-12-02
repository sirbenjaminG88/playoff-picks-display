import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Admin = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const syncPlayoffTeams = async () => {
    setIsLoading(true);
    setResult(null);

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
        setResult(data);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

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
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? "Syncing..." : "Sync Playoff Teams"}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Sync Results:</h3>
              <ul className="space-y-1 text-sm">
                <li>Games Found: {result.gamesFound}</li>
                <li>Teams Extracted: {result.teamsExtracted}</li>
                <li>Teams Synced: {result.teamsSynced}</li>
              </ul>
              
              {result.teams && result.teams.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Playoff Teams:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {result.teams.map((team: any) => (
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
    </div>
  );
};

export default Admin;

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  parseDKCSV,
  normalizePlayerName,
  getTeamNameFromAbbrev,
  DKSalaryRow,
  PLAYOFF_WEEK_LABELS,
} from "@/lib/teamAbbreviations";

interface MatchedPlayer {
  dkRow: DKSalaryRow;
  matchedPlayerId: string | null;
  matchedPlayerName: string | null;
  matchedTeamName: string | null;
  status: "matched" | "unmatched";
}

interface DKSalaryImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Array<{
    id: string;
    name: string;
    team_name: string;
    position: string;
  }>;
  onImportComplete: () => void;
}

export function DKSalaryImportModal({
  open,
  onOpenChange,
  players,
  onImportComplete,
}: DKSalaryImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [csvData, setCsvData] = useState<DKSalaryRow[]>([]);
  const [matchedPlayers, setMatchedPlayers] = useState<MatchedPlayer[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseDKCSV(content);
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const performMatching = () => {
    // Create a normalized lookup map for players
    const playerLookup = new Map<string, { id: string; name: string; team_name: string }>();
    
    for (const player of players) {
      const normalizedName = normalizePlayerName(player.name);
      // Key by normalized name + team name
      playerLookup.set(`${normalizedName}|${player.team_name.toLowerCase()}`, {
        id: player.id,
        name: player.name,
        team_name: player.team_name,
      });
      // Also store just by normalized name for fallback
      if (!playerLookup.has(normalizedName)) {
        playerLookup.set(normalizedName, {
          id: player.id,
          name: player.name,
          team_name: player.team_name,
        });
      }
    }

    const matched: MatchedPlayer[] = csvData.map((dkRow) => {
      const normalizedDKName = normalizePlayerName(dkRow.name);
      const teamName = getTeamNameFromAbbrev(dkRow.teamAbbrev);

      // Try exact match with name + team
      let match = teamName
        ? playerLookup.get(`${normalizedDKName}|${teamName.toLowerCase()}`)
        : null;

      // Fallback to just name match
      if (!match) {
        match = playerLookup.get(normalizedDKName);
      }

      if (match) {
        return {
          dkRow,
          matchedPlayerId: match.id,
          matchedPlayerName: match.name,
          matchedTeamName: match.team_name,
          status: "matched" as const,
        };
      }

      return {
        dkRow,
        matchedPlayerId: null,
        matchedPlayerName: null,
        matchedTeamName: null,
        status: "unmatched" as const,
      };
    });

    setMatchedPlayers(matched);
    setStep(2);
  };

  const stats = useMemo(() => {
    const matched = matchedPlayers.filter((m) => m.status === "matched").length;
    const unmatched = matchedPlayers.filter((m) => m.status === "unmatched").length;
    return { matched, unmatched, total: matchedPlayers.length };
  }, [matchedPlayers]);

  const handleImport = async () => {
    setImporting(true);

    const weekNum = parseInt(selectedWeek, 10);
    const matchedItems = matchedPlayers.filter((m) => m.status === "matched");

    try {
      // Update in batches
      for (const item of matchedItems) {
        const { error } = await supabase
          .from("playoff_players")
          .update({
            dk_salary: item.dkRow.salary,
            dk_salary_week: weekNum,
          })
          .eq("id", item.matchedPlayerId);

        if (error) {
          console.error("Error updating player:", error);
        }
      }

      toast({
        title: "Import complete",
        description: `Updated ${matchedItems.length} players with DraftKings salaries`,
      });

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }

    setImporting(false);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedWeek("");
    setCsvData([]);
    setMatchedPlayers([]);
    setFileName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import DraftKings Salaries</DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload a DraftKings CSV file and select the playoff week."}
            {step === 2 && "Review matched players before importing."}
            {step === 3 && "Confirm and import salaries."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="week">Playoff Week</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger id="week">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAYOFF_WEEK_LABELS).map(([week, label]) => (
                    <SelectItem key={week} value={week}>
                      Week {week} - {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv">DraftKings CSV File</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
              </div>
              {fileName && (
                <p className="text-sm text-muted-foreground">
                  Loaded: {fileName} ({csvData.length} players)
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-4 pb-4">
              <Badge variant="secondary" className="text-sm">
                <Check className="w-3 h-3 mr-1" />
                {stats.matched} matched
              </Badge>
              {stats.unmatched > 0 && (
                <Badge variant="destructive" className="text-sm">
                  <X className="w-3 h-3 mr-1" />
                  {stats.unmatched} unmatched
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">DK Name</th>
                    <th className="text-left p-2 font-medium">Team</th>
                    <th className="text-right p-2 font-medium">Salary</th>
                    <th className="text-left p-2 font-medium">Matched To</th>
                    <th className="text-center p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedPlayers.map((item, idx) => (
                    <tr
                      key={idx}
                      className={
                        item.status === "unmatched"
                          ? "bg-red-900/20"
                          : "hover:bg-muted/30"
                      }
                    >
                      <td className="p-2">{item.dkRow.name}</td>
                      <td className="p-2 text-muted-foreground">
                        {item.dkRow.teamAbbrev}
                      </td>
                      <td className="p-2 text-right font-mono">
                        ${item.dkRow.salary.toLocaleString()}
                      </td>
                      <td className="p-2">
                        {item.matchedPlayerName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {item.status === "matched" ? (
                          <Check className="w-4 h-4 text-green-500 inline" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={performMatching}
                disabled={!selectedWeek || csvData.length === 0}
              >
                <Upload className="w-4 h-4 mr-2" />
                Process CSV
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || stats.matched === 0}>
                {importing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Import {stats.matched} Players
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

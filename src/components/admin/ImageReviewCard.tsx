import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ImageOff, Loader2, ChevronLeft, ChevronRight, Link, ArrowRightLeft, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Player {
  id: string;
  full_name: string;
  team_name: string | null;
  team_abbr: string | null;
  position: string;
  image_url: string | null;
  espn_headshot_url: string | null;
  headshot_status: string | null;
  points_for_headshot: number | null;
}

export function ImageReviewCard() {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingEspn, setIsSyncingEspn] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setIsLoading(true);
    try {
      // Load players with non-null points_for_headshot that haven't been manually reviewed
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, team_name, team_abbr, position, image_url, espn_headshot_url, headshot_status, points_for_headshot")
        .eq("season", 2025)
        .not("points_for_headshot", "is", null)
        .not("headshot_status", "in", '("verified","wrong_player","empty")')
        .order("points_for_headshot", { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading players:", error);
      toast({
        title: "Error",
        description: "Failed to load players for review",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncEspnHeadshots = async () => {
    setIsSyncingEspn(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("sync-espn-roster-headshots", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      toast({
        title: "ESPN Sync Complete",
        description: `Matched ${response.data.matched} players. ${response.data.unmatched} unmatched.`,
      });

      // Reload players to get updated espn_headshot_url values
      await loadPlayers();
    } catch (error) {
      console.error("Error syncing ESPN headshots:", error);
      toast({
        title: "Error",
        description: "Failed to sync ESPN headshots",
        variant: "destructive",
      });
    } finally {
      setIsSyncingEspn(false);
    }
  };

  const updatePlayerStatus = async (status: "verified" | "wrong_player" | "empty", replacementUrl?: string) => {
    if (!players[currentIndex]) return;

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = { 
        headshot_status: status,
        has_headshot: status === "verified" || (replacementUrl ? true : false)
      };

      // If a replacement URL is provided, update the image_url as well
      if (replacementUrl) {
        updateData.image_url = replacementUrl;
        updateData.has_headshot = true;
        updateData.headshot_status = "verified";
      }

      const { error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", players[currentIndex].id);

      if (error) throw error;

      setReviewedCount((prev) => prev + 1);
      setShowUrlInput(false);
      setNewImageUrl("");
      
      // Move to next player
      if (currentIndex < players.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        toast({
          title: "Review Complete",
          description: `All ${players.length} players have been reviewed!`,
        });
      }
    } catch (error) {
      console.error("Error updating player:", error);
      toast({
        title: "Error",
        description: "Failed to update player status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseEspn = () => {
    const player = players[currentIndex];
    if (player?.espn_headshot_url) {
      updatePlayerStatus("verified", player.espn_headshot_url);
    }
  };

  const handleKeepCurrent = () => {
    updatePlayerStatus("verified");
  };

  const handleBothBad = () => {
    setShowUrlInput(true);
  };

  const handleSaveWithNewUrl = () => {
    if (newImageUrl.trim()) {
      updatePlayerStatus("verified", newImageUrl.trim());
    }
  };

  const handleSkipReplacement = () => {
    updatePlayerStatus("wrong_player");
    setShowUrlInput(false);
    setNewImageUrl("");
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowUrlInput(false);
      setNewImageUrl("");
    }
  };

  const goToNext = () => {
    if (currentIndex < players.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowUrlInput(false);
      setNewImageUrl("");
    }
  };

  const currentPlayer = players[currentIndex];
  const progress = players.length > 0 ? ((currentIndex + 1) / players.length) * 100 : 0;
  const hasEspnImage = !!currentPlayer?.espn_headshot_url;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading Players...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manual Image Review</CardTitle>
          <CardDescription>No players to review. All players with fantasy points have been classified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={loadPlayers} variant="outline">
            Refresh
          </Button>
          <Button onClick={syncEspnHeadshots} disabled={isSyncingEspn} variant="secondary">
            {isSyncingEspn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync ESPN Headshots
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manual Image Review</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={syncEspnHeadshots} disabled={isSyncingEspn} variant="outline" size="sm">
              {isSyncingEspn ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Sync ESPN
            </Button>
            <Badge variant="secondary">
              {currentIndex + 1} / {players.length}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Review each player's headshot. Compare current vs ESPN and choose the best. Reviewed: {reviewedCount}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPlayer && (
          <>
            {/* Player Info */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">{currentPlayer.full_name}</h3>
              <div className="flex justify-center gap-2">
                <Badge variant="outline">{currentPlayer.position}</Badge>
                <Badge variant="secondary">{currentPlayer.team_abbr || currentPlayer.team_name || "Unknown"}</Badge>
                {currentPlayer.points_for_headshot && (
                  <Badge className="bg-green-600">{currentPlayer.points_for_headshot.toFixed(1)} pts</Badge>
                )}
              </div>
            </div>

            {/* Side-by-Side Image Comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Current Image */}
              <div className="space-y-2">
                <div className="text-center text-sm font-medium text-muted-foreground">Current</div>
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                  {currentPlayer.image_url ? (
                    <img
                      src={currentPlayer.image_url}
                      alt={`${currentPlayer.full_name} - Current`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="text-muted-foreground text-center p-4">
                      <ImageOff className="w-12 h-12 mx-auto mb-2" />
                      <span className="text-sm">No image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ESPN Image */}
              <div className="space-y-2">
                <div className="text-center text-sm font-medium text-muted-foreground">ESPN</div>
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                  {currentPlayer.espn_headshot_url ? (
                    <img
                      src={currentPlayer.espn_headshot_url}
                      alt={`${currentPlayer.full_name} - ESPN`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="text-muted-foreground text-center p-4">
                      <ImageOff className="w-12 h-12 mx-auto mb-2" />
                      <span className="text-sm">No ESPN match</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Status */}
            {currentPlayer.headshot_status && (
              <div className="text-center text-sm text-muted-foreground">
                Current status: <Badge variant="outline">{currentPlayer.headshot_status}</Badge>
              </div>
            )}

            {/* Action Buttons */}
            {!showUrlInput ? (
              <div className="flex justify-center gap-3 flex-wrap">
                <Button
                  onClick={handleKeepCurrent}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Keep Current
                </Button>
                <Button
                  onClick={handleUseEspn}
                  disabled={isSaving || !hasEspnImage}
                  variant="default"
                  size="lg"
                  title={!hasEspnImage ? "No ESPN image available" : "Use ESPN image"}
                >
                  <ArrowRightLeft className="w-5 h-5 mr-2" />
                  Use ESPN
                </Button>
                <Button
                  onClick={handleBothBad}
                  disabled={isSaving}
                  variant="destructive"
                  size="lg"
                >
                  <X className="w-5 h-5 mr-2" />
                  Both Bad
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Paste the correct image URL for {currentPlayer.full_name}:
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/..."
                      className="pl-10"
                    />
                  </div>
                </div>
                {newImageUrl && (
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted border border-border">
                      <img
                        src={newImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={handleSaveWithNewUrl}
                    disabled={isSaving || !newImageUrl.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save New Image
                  </Button>
                  <Button
                    onClick={handleSkipReplacement}
                    disabled={isSaving}
                    variant="secondary"
                  >
                    Skip (No Replacement)
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUrlInput(false);
                      setNewImageUrl("");
                    }}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                onClick={goToPrevious}
                disabled={currentIndex === 0 || isSaving}
                variant="ghost"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                onClick={goToNext}
                disabled={currentIndex >= players.length - 1 || isSaving}
                variant="ghost"
              >
                Skip / Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

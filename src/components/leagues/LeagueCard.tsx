import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, ChevronUp, Clock, Crown, FileText, Trophy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { LeagueIcon } from "./LeagueIcon";
import { getInitials } from "@/lib/displayName";
import { useLeague } from "@/contexts/LeagueContext";

interface LeagueMember {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface LeagueCardProps {
  leagueId: string;
  leagueName: string;
  season: number;
  seasonType: string;
  userRole: string;
  maxMembers: number | null;
  iconUrl?: string | null;
}

export function LeagueCard({ 
  leagueId, 
  leagueName, 
  season, 
  seasonType, 
  userRole,
  maxMembers,
  iconUrl
}: LeagueCardProps) {
  const navigate = useNavigate();
  const { setCurrentLeagueId } = useLeague();
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nextDeadline, setNextDeadline] = useState<Date | null>(null);

  const isCommissioner = userRole === "commissioner";

  useEffect(() => {
    fetchMemberCount();
    fetchNextDeadline();
  }, [leagueId]);

  useEffect(() => {
    if (isOpen && members.length === 0) {
      fetchMembers();
    }
  }, [isOpen]);

  const fetchMemberCount = async () => {
    const { count } = await supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("league_id", leagueId);
    
    setMemberCount(count || 0);
  };

  const fetchMembers = async () => {
    setLoading(true);
    
    // Get all members
    const { data: memberData } = await supabase
      .from("league_members")
      .select("user_id, role")
      .eq("league_id", leagueId);

    if (!memberData) {
      setLoading(false);
      return;
    }

    // Get profile info for each member
    const memberProfiles: LeagueMember[] = [];
    for (const member of memberData) {
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("display_name, avatar_url")
        .eq("id", member.user_id)
        .maybeSingle();

      memberProfiles.push({
        user_id: member.user_id,
        role: member.role,
        display_name: profile?.display_name || "Unknown",
        avatar_url: profile?.avatar_url || null,
      });
    }

    // Sort: commissioners first, then alphabetically
    memberProfiles.sort((a, b) => {
      if (a.role === "commissioner" && b.role !== "commissioner") return -1;
      if (a.role !== "commissioner" && b.role === "commissioner") return 1;
      return (a.display_name || "").localeCompare(b.display_name || "");
    });

    setMembers(memberProfiles);
    setLoading(false);
  };

  const fetchNextDeadline = async () => {
    // For playoffs, get the first game of the current/next week
    if (seasonType === "POST") {
      const { data } = await supabase
        .from("playoff_games")
        .select("kickoff_at")
        .eq("season", season)
        .gte("kickoff_at", new Date().toISOString())
        .order("kickoff_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.kickoff_at) {
        setNextDeadline(new Date(data.kickoff_at));
      }
    } else {
      // Regular season
      const { data } = await supabase
        .from("regular_season_games")
        .select("game_date")
        .eq("season", season)
        .gte("game_date", new Date().toISOString())
        .order("game_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.game_date) {
        setNextDeadline(new Date(data.game_date));
      }
    }
  };

  // getInitials is now imported from @/lib/displayName

  const formatDeadline = (date: Date) => {
    return formatInTimeZone(date, "America/New_York", "EEE MMM d, h:mm a 'ET'");
  };

  const handleSubmitPicks = () => {
    setCurrentLeagueId(leagueId);
    navigate("/picks");
  };

  const handleViewResults = () => {
    setCurrentLeagueId(leagueId);
    navigate("/results");
  };

  const handleShare = async () => {
    try {
      // Fetch the join code
      const { data: joinCode, error } = await supabase
        .rpc("get_league_join_code", { p_league_id: leagueId });

      if (error) throw error;
      if (!joinCode) {
        toast.error("Unable to get join code");
        return;
      }

      const appStoreUrl = "https://apps.apple.com/us/app/emma-playoff-picks/id6756786358";
      const shareText = `Join my "${leagueName}" playoff fantasy league on EMMA!\n\nJoin code: ${joinCode}\n\nDownload EMMA:\n${appStoreUrl}\n\nEnter this code to join!`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Join "${leagueName}" on EMMA`,
            text: shareText,
          });
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.error("Share failed:", err);
            await copyToClipboard(joinCode);
          }
        }
      } else {
        await copyToClipboard(joinCode);
      }
    } catch (err) {
      console.error("Error sharing league:", err);
      toast.error("Unable to share league");
    }
  };

  const copyToClipboard = async (joinCode: string) => {
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Join code copied to clipboard!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <Card className="border-2 border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <LeagueIcon iconUrl={iconUrl} leagueName={leagueName} size="md" />
            <div>
              <h3 className="font-bold text-lg text-foreground">{leagueName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{season} {seasonType === "POST" ? "Playoffs" : "Regular Season"}</span>
                {isCommissioner && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Commissioner
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button onClick={handleShare} variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{memberCount}{maxMembers ? ` / ${maxMembers}` : ""} members</span>
          </div>
          {nextDeadline && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Picks due by {formatDeadline(nextDeadline)}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={handleSubmitPicks} className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Submit Picks
          </Button>
          <Button onClick={handleViewResults} variant="outline" className="flex-1">
            <Trophy className="w-4 h-4 mr-2" />
            View Results
          </Button>
        </div>

        {/* Expandable member list */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-muted-foreground hover:bg-muted/50 data-[state=open]:bg-transparent data-[state=open]:text-muted-foreground"
            >
              <span>View League Members</span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {loading ? (
              <div className="text-center text-muted-foreground text-sm py-4">Loading members...</div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div 
                    key={member.user_id} 
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <Avatar className="h-8 w-8">
                      {member.avatar_url ? (
                        <AvatarImage src={member.avatar_url} alt={member.display_name || ""} />
                      ) : (
                        <AvatarFallback className="bg-foreground/80 text-background text-xs">
                          {member.display_name ? getInitials(member.display_name) : "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {member.display_name}
                      </span>
                    </div>
                    {member.role === "commissioner" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3" />
                        Commissioner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

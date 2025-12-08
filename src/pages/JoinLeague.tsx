import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Users, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { LeagueIcon } from "@/components/leagues/LeagueIcon";

interface LeagueDetails {
  id: string;
  name: string;
  max_members: number;
  season: number;
  season_type: string;
  icon_url: string | null;
  commissioner_name: string | null;
  member_count: number;
}

const JoinLeague = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [league, setLeague] = useState<LeagueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("No join code provided");
      setLoading(false);
      return;
    }

    fetchLeagueDetails();
  }, [code, user]);

  const fetchLeagueDetails = async () => {
    if (!code) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch league by join code (case-insensitive)
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name, max_members, season, season_type, icon_url")
        .ilike("join_code", code)
        .single();

      if (leagueError || !leagueData) {
        setError("League not found. Check the join code and try again.");
        setLoading(false);
        return;
      }

      // Get member count
      const { count: memberCount } = await supabase
        .from("league_members")
        .select("*", { count: "exact", head: true })
        .eq("league_id", leagueData.id);

      // Get commissioner name
      const { data: commissionerData } = await supabase
        .from("league_members")
        .select("user_id")
        .eq("league_id", leagueData.id)
        .eq("role", "commissioner")
        .single();

      let commissionerName: string | null = null;
      if (commissionerData) {
        const { data: userData } = await supabase
          .from("public_profiles")
          .select("display_name")
          .eq("id", commissionerData.user_id)
          .single();
        commissionerName = userData?.display_name || "Unknown";
      }

      // Check if current user is already a member
      if (user) {
        const { data: membership } = await supabase
          .from("league_members")
          .select("id")
          .eq("league_id", leagueData.id)
          .eq("user_id", user.id)
          .single();

        if (membership) {
          setAlreadyMember(true);
        }
      }

      setLeague({
        ...leagueData,
        commissioner_name: commissionerName,
        member_count: memberCount || 0,
      });
    } catch (err) {
      console.error("Error fetching league:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Redirect to sign in, then back here (using state for proper redirect chain)
      navigate("/signin", { state: { from: `/join/${code}` } });
      return;
    }

    if (!league) return;

    // Check if league is full
    if (league.member_count >= league.max_members) {
      toast({
        title: "League is full",
        description: `This league has reached its maximum of ${league.max_members} members.`,
        variant: "destructive",
      });
      return;
    }

    setJoining(true);

    try {
      const { error: joinError } = await supabase
        .from("league_members")
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: "player",
        });

      if (joinError) {
        if (joinError.message.includes("duplicate")) {
          setAlreadyMember(true);
          toast({
            title: "Already a member",
            description: "You're already in this league!",
          });
        } else {
          throw joinError;
        }
      } else {
        setJoinSuccess(true);
        toast({
          title: "Welcome to the league!",
          description: `You've joined ${league.name}`,
        });
      }
    } catch (err) {
      console.error("Error joining league:", err);
      toast({
        title: "Failed to join",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handleGoToLeague = () => {
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading league details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!league) return null;

  // Success state after joining
  if (joinSuccess || alreadyMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {alreadyMember ? "You're already in!" : "You're in!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {alreadyMember 
                ? `You're already a member of ${league.name}`
                : `Welcome to ${league.name}!`
              }
            </p>
            <Button onClick={handleGoToLeague} className="w-full">
              Go to League
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join confirmation state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <LeagueIcon iconUrl={league.icon_url} leagueName={league.name} size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              You're Invited!
            </h1>
            <p className="text-muted-foreground">
              Join this EMMA playoff league
            </p>
          </div>

          {/* League details */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">League</span>
              <span className="font-semibold text-foreground">{league.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Commissioner</span>
              <span className="text-foreground">{league.commissioner_name || "Unknown"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Members</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {league.member_count} / {league.max_members}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Season</span>
              <span className="text-foreground">
                {league.season} {league.season_type === "POST" ? "Playoffs" : "Regular"}
              </span>
            </div>
          </div>

          {/* Full league warning */}
          {league.member_count >= league.max_members && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-center">
              <p className="text-destructive text-sm">
                This league is full ({league.max_members}/{league.max_members} members)
              </p>
            </div>
          )}

          {/* Join button */}
          <Button
            onClick={handleJoin}
            className="w-full"
            size="lg"
            disabled={joining || league.member_count >= league.max_members}
          >
            {joining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : !user ? (
              "Sign in to Join"
            ) : (
              "Join This League"
            )}
          </Button>

          {!user && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              You'll need to sign in or create an account first
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinLeague;

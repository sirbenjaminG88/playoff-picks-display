import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, BarChart3, Users, LogIn, LogOut, Plus, TrendingUp, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { CreateLeagueModal } from "@/components/leagues/CreateLeagueModal";
import { JoinLeagueModal } from "@/components/leagues/JoinLeagueModal";
import { LeagueCard } from "@/components/leagues/LeagueCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserLeague {
  id: string;
  league_id: string;
  role: string;
  league: {
    id: string;
    name: string;
    season: number;
    season_type: string;
    max_members: number | null;
    icon_url: string | null;
  };
}

const LeaguesHome = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leagues, setLeagues] = useState<UserLeague[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserLeagues();
    }
  }, [user]);

  const fetchUserLeagues = async () => {
    if (!user) return;
    
    setLeaguesLoading(true);
    
    const { data, error } = await supabase
      .from("league_members")
      .select(`
        id,
        league_id,
        role,
        league:leagues(id, name, season, season_type, max_members, icon_url)
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching leagues:", error);
    } else if (data) {
      // Filter to only show playoff leagues (POST) for now
      const playoffLeagues = data.filter(
        (m) => m.league && (m.league as any).season_type === "POST"
      ) as UserLeague[];
      setLeagues(playoffLeagues);
    }
    
    setLeaguesLoading(false);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/leagues-home");
  };

  const handleCreateLeague = () => {
    if (!user) {
      navigate("/signin", { state: { from: "/leagues-home" } });
    } else {
      setShowCreateModal(true);
    }
  };

  const handleLeagueCreated = () => {
    // Refresh the leagues list after creating a new one
    fetchUserLeagues();
  };

  // LOGGED-OUT VIEW
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6 shadow-lg">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>

            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              EMMA
            </h1>
            <p className="text-2xl font-semibold text-foreground mb-3">
              Fantasy Football Doesn't Have to End.
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Keep playing through the NFL Playoffs in the most exciting four weeks of the season.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Play With Any League Size</h3>
                <p className="text-sm text-muted-foreground">
                  Invite friends, coworkers, or your full fantasy league—EMMA works with any number of players.
                </p>
              </div>

              <div className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Use-'Em-Once Weekly Picks</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a QB, RB, and WR/TE each playoff week — but once you pick a player, they're gone for the rest of the playoffs.
                </p>
              </div>

              <div className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Trophy className="w-8 h-8 text-accent mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Win the Postseason</h3>
                <p className="text-sm text-muted-foreground">
                  Rack up fantasy points each week. Highest total after the playoffs wins it all.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signin" state={{ from: "/leagues-home" }}>
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In / Join League
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                onClick={handleCreateLeague}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create League
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasLeagues = leagues.length > 0;

  // LOGGED-IN VIEW - Leagues Hub
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 pb-24">
        {/* Header with user info */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl shadow-md">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">EMMA</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5">
              <Avatar className="h-6 w-6">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.display_name || ""} />
                ) : (
                  <AvatarFallback className="bg-foreground/80 text-background text-xs font-medium">
                    {profile?.display_name ? getInitials(profile.display_name) : "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm font-medium text-foreground">{profile?.display_name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Your Leagues</h2>
          <p className="text-muted-foreground">Manage your fantasy football leagues</p>
        </div>

        {/* Create / Join League Buttons */}
        <div className="flex gap-3 mb-8">
          <Button 
            size="lg" 
            className="shadow-lg hover:shadow-xl transition-all"
            onClick={handleCreateLeague}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create League
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="shadow-lg hover:shadow-xl transition-all"
            onClick={() => setShowJoinModal(true)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Join with Code
          </Button>
        </div>

        {/* Leagues Section */}
        {leaguesLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading leagues...</div>
        ) : !hasLeagues ? (
          <Card className="border-2 border-dashed border-border bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">You're not in any leagues yet.</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Create a new league to start playing, or join an existing league with an invite link.
              </p>
              <Button onClick={handleCreateLeague}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First League
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {leagues.map((membership) => (
              <LeagueCard
                key={membership.id}
                leagueId={membership.league.id}
                leagueName={membership.league.name}
                season={membership.league.season}
                seasonType={membership.league.season_type}
                userRole={membership.role}
                maxMembers={membership.league.max_members}
                iconUrl={membership.league.icon_url}
              />
            ))}
          </div>
        )}

        {/* Explainer Card - always visible for logged-in users */}
        <div className="mt-8">
          <Card className="bg-card border-2 border-border">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Use-'Em-Once Weekly Picks</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose a QB, RB, and WR/TE each playoff week — but once you pick a player, they're gone for the rest of the playoffs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create League Modal */}
      <CreateLeagueModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />

      {/* Join League Modal */}
      <JoinLeagueModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
      />
    </div>
  );
};

export default LeaguesHome;

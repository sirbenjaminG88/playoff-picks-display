import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, BarChart3, Users, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* User Status */}
          {!loading && user && profile && (
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5">
                <Avatar className="h-6 w-6">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.display_name || ""} />
                  ) : (
                    <AvatarFallback className="bg-foreground/80 text-background text-xs font-medium">
                      {profile.display_name ? getInitials(profile.display_name) : "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-sm font-medium text-foreground">{profile.display_name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6 shadow-lg">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Title */}
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            EMMA
          </h1>
          <p className="text-2xl font-semibold text-foreground mb-3">
            Fantasy Football Doesn't Have to End.
          </p>
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
            Keep playing through the NFL Playoffs in the most exciting four weeks of the season.
          </p>
          <p className="text-base text-muted-foreground mb-12 max-w-2xl mx-auto">
            Regular-season fantasy ends too soon. EMMA brings fantasy football into the playoffs—simple rules, high stakes, and no repeats.
          </p>

          {/* Features Grid */}
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

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!loading && !user ? (
              <Link to="/signin">
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In / Join League
                </Button>
              </Link>
            ) : (
              <Link to="/picks">
                <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                  Make Your Picks
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

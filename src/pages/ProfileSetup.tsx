import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, User, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Preset avatar options
const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Dakota",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emery",
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated or already has profile
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/signin", { replace: true });
      } else if (profile && profile.display_name) {
        navigate("/picks", { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be signed in to set up your profile.");
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: selectedAvatar,
        })
        .eq("id", user.id);

      if (updateError) {
        // If update fails, try insert (profile might not exist yet)
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email!,
            display_name: displayName.trim(),
            avatar_url: selectedAvatar,
          });

        if (insertError) {
          throw insertError;
        }
      }

      await refreshProfile();
      
      toast({
        title: "Profile created!",
        description: "Welcome to EMMA.",
      });
      
      navigate("/picks");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mx-auto shadow-lg">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Set up your profile
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                One more step to join the league
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-background border-border"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Choose an avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((avatar, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative rounded-full p-0.5 transition-all ${
                        selectedAvatar === avatar
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                          : "hover:ring-2 hover:ring-muted hover:ring-offset-2 hover:ring-offset-card"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={avatar} alt={`Avatar ${index + 1}`} />
                        <AvatarFallback className="bg-muted">
                          {index + 1}
                        </AvatarFallback>
                      </Avatar>
                      {selectedAvatar === avatar && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Or skip to use your initials
                </p>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                <Avatar className="h-12 w-12">
                  {selectedAvatar ? (
                    <AvatarImage src={selectedAvatar} alt="Preview" />
                  ) : (
                    <AvatarFallback className="bg-foreground/80 text-background font-semibold">
                      {displayName ? getInitials(displayName) : "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {displayName || "Your Name"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !displayName.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, User, Loader2, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getInitials, validateDisplayName } from "@/lib/displayName";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; action?: string } | null;
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex-1 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be smaller than 5MB.");
        return;
      }
      setError(null);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSkipAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    setUploading(true);
    try {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      throw new Error("Failed to upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be signed in to set up your profile.");
      return;
    }

    const validationError = validateDisplayName(displayName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update profiles table (backwards compatibility)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email!,
            display_name: displayName.trim(),
            avatar_url: avatarUrl,
          });

        if (insertError) throw insertError;
      }

      // Also update users table
      await supabase
        .from("users")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      await refreshProfile();
      
      toast({
        title: "Profile created!",
        description: "Welcome to EMMA.",
      });
      
      // Redirect to original destination or default to /picks
      const redirectTo = locationState?.from || "/picks";
      navigate(redirectTo, { replace: true, state: { action: locationState?.action } });
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // getInitials is now imported from @/lib/displayName

  const isSubmitting = loading || uploading;

  return (
    <div className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
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

              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <AvatarFallback className="bg-foreground/80 text-background font-semibold text-2xl">
                      {displayName ? getInitials(displayName) : "?"}
                    </AvatarFallback>
                  )}
                </Avatar>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadClick}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {avatarPreview ? "Change photo" : "Upload photo"}
                  </Button>
                  
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleSkipAvatar}
                      disabled={isSubmitting}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Remove and use initials instead
                    </button>
                  )}
                  
                  {!avatarPreview && (
                    <p className="text-xs text-muted-foreground">
                      Or skip to use your initials
                    </p>
                  )}
                </div>
              </div>

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
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                <Avatar className="h-12 w-12">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Preview" />
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
                disabled={isSubmitting || !displayName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploading ? "Uploading..." : "Saving..."}
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

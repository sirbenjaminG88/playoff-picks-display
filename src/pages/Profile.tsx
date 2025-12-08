import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Camera, Loader2, Mail, User, Trash2, LogOut, Fingerprint } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// TODO: Biometric login - When implemented:
// - Check if device supports biometrics via Capacitor plugin
// - If enabled, store credentials in secure storage after successful login
// - On app launch, check for stored credentials and prompt biometric auth
// - Add "Sign in with Face ID" button to SignIn.tsx

// TODO: Add post-signup biometric opt-in screen that offers enabling Face ID immediately after successful signup/first login.

/**
 * Profile Page - Unified Account & Settings screen
 * 
 * This is the PRIMARY entry point for account management, including:
 * - Profile editing (avatar, display name)
 * - Email display (read-only)
 * - Sign out
 * - Security settings (biometrics - coming soon)
 * - Account deletion (for App Store compliance)
 * 
 * Uses the centralized useAccountDeletion hook for deletion logic.
 * Accessed via the profile icon in the header (Home page, and later Submissions/Results).
 */
const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const { deleteAccount, isDeleting, error: deleteError, clearError } = useAccountDeletion();
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

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

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

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
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let avatarUrl = avatarPreview;
      
      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Also update users table
      await supabase
        .from("users")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      await refreshProfile();
      setAvatarFile(null);
      
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * TODO: Re-enable email change flow once Lovable Cloud exposes 
   * Auth Hook configuration for `email_change` events.
   * The send-auth-email edge function already supports it.
   * 
   * The handleChangeEmail function was removed because Supabase 
   * is not triggering our send-auth-email edge function for 
   * email_change events, so confirmation emails never send.
   */

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const success = await deleteAccount();
    if (success) {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/", { replace: true });
    }
    // Error is shown in the dialog via deleteError state
  };

  const handleOpenDeleteDialog = () => {
    clearError();
    setIsDeleteDialogOpen(true);
  };

  const hasProfileChanges = 
    displayName !== (profile?.display_name || "") || 
    avatarFile !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 pb-24 max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Avatar */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar" />
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={saving}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Change photo
                </Button>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  Display Name
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
                    disabled={saving}
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving || !hasProfileChanges}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Email Card - Currently Read-Only */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Email Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Current Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-10 bg-muted border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email changes are not currently supported. Contact support if you need to update your email address.
                </p>
              </div>
              {/* 
                TODO: Email change is disabled because Lovable Cloud doesn't expose 
                Auth Hook configuration for email_change events. The send-auth-email 
                edge function supports it, but the hook needs to be configured in 
                Supabase dashboard to trigger on email_change events.
                
                Re-enable this section once hook configuration is available.
              */}
            </CardContent>
          </Card>

          {/* Security & Sign-In Section */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-primary" />
                Security & Sign-In
              </CardTitle>
              <CardDescription>
                Manage how you sign in to EMMA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Biometric Toggle (Disabled - Coming Soon) */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Use Face ID / Touch ID
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Biometric login coming soon.
                    </p>
                  </div>
                </div>
                <Switch
                  disabled
                  checked={false}
                  className="opacity-50"
                  aria-label="Enable biometric login (coming soon)"
                />
              </div>

              <Separator />

              {/* Sign Out */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={handleOpenDeleteDialog}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all associated data.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {deleteError && (
                    <Alert variant="destructive">
                      <AlertDescription>{deleteError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete my account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                This will permanently delete your account and all associated data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ArrowLeft, Camera, Loader2, Mail, User, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Profile Page - Secondary entry point for account deletion
 * 
 * Uses the centralized useAccountDeletion hook for deletion logic.
 * The primary entry point for deletion is the Settings page.
 */
const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { deleteAccount, isDeleting, error: deleteError, clearError } = useAccountDeletion();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
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
    if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

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

  const handleChangeEmail = async () => {
    if (!email.trim() || email === user?.email) return;

    setSavingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) throw error;

      setEmailSuccess(true);
      toast({
        title: "Confirmation sent",
        description: "Check your new email for a confirmation link.",
      });
    } catch (err: any) {
      console.error("Error changing email:", err);
      setEmailError(err.message || "Failed to change email.");
    } finally {
      setSavingEmail(false);
    }
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

  const hasEmailChanges = email !== (user?.email || "");

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
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
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

          {/* Email Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Email Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailError && (
                <Alert variant="destructive">
                  <AlertDescription>{emailError}</AlertDescription>
                </Alert>
              )}
              
              {emailSuccess && (
                <Alert>
                  <AlertDescription>
                    Check your new email for a confirmation link.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-border"
                    disabled={savingEmail}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive a confirmation email to verify the change.
                </p>
              </div>

              <Button
                onClick={handleChangeEmail}
                disabled={savingEmail || !hasEmailChanges}
                variant="outline"
                className="w-full"
              >
                {savingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Change Email"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50 bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
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

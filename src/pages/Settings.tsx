import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  User, 
  LogOut, 
  Fingerprint, 
  Trash2,
  ChevronRight,
  Settings as SettingsIcon
} from "lucide-react";

// TODO: Biometric login - When implemented:
// - Store opt-in flag in secure local storage (via Capacitor Secure Storage)
// - Trigger a native biometric enrollment process
// - Support tapping "Sign in with Face ID" on SignIn.tsx
// - Use @capacitor/biometric-auth or similar plugin

// TODO: Account deletion - When implemented:
// - Create a Supabase RPC function: delete_user_account()
// - The RPC should delete user_picks, league_members, users, profiles records
// - Then call admin.deleteUser() to remove from auth.users
// - Call the RPC from this page after confirmation

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const handleEditProfile = () => {
    navigate("/profile");
  };

  const handleDeleteAccount = () => {
    // TODO: Account deletion - Navigate to a confirmation flow or show modal
    // For now, redirect to profile page which has the delete account UI
    navigate("/profile");
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not authenticated (ProtectedRoute should handle this, but just in case)
  if (!user) {
    navigate("/signin", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 pb-24 max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
        </div>
        <p className="text-muted-foreground ml-12 mb-8">
          Manage your account, security, and app preferences.
        </p>

        <div className="space-y-6">
          {/* Account Section */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Account
              </CardTitle>
              <CardDescription>
                Your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Display */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email || "No email set"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Display Name */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Display Name</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.display_name || "Not set"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditProfile}
                  className="text-primary"
                >
                  Edit
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <Separator />

              {/* Sign Out */}
              <Button
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </Button>
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
              {/* 
                TODO: Biometric login - When implemented:
                - Check if device supports biometrics via Capacitor plugin
                - If enabled, store credentials in secure storage after successful login
                - On app launch, check for stored credentials and prompt biometric auth
                - Add "Sign in with Face ID" button to SignIn.tsx
              */}
            </CardContent>
          </Card>

          {/* Danger Zone Section */}
          <Card className="border-destructive/30 bg-card">
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
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Delete Account
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently remove your account and all data.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteAccount}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Delete
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              {/* 
                TODO: Account deletion - When implemented:
                1. Show confirmation modal with password re-entry
                2. Call supabase.rpc('delete_user_account') 
                3. Sign out user and redirect to landing page
                4. The RPC function should:
                   - Delete from user_picks where auth_user_id = auth.uid()
                   - Delete from league_members where user_id = auth.uid()
                   - Delete from users where id = auth.uid()
                   - Delete from profiles where id = auth.uid()
                   - Call auth.admin.deleteUser() via service role
              */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;

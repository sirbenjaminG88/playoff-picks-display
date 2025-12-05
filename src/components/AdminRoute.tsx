import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldX } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not signed in - redirect to sign in
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Signed in but no profile - redirect to setup
  if (!profile || !profile.display_name) {
    return <Navigate to="/profile-setup" replace />;
  }

  // Signed in with profile but not admin - show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <ShieldX className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          You don't have permission to access this page.
        </p>
        <a 
          href="/picks" 
          className="text-primary hover:underline"
        >
          Return to Picks
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

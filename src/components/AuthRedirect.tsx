import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Handles the root route "/" redirect after magic link authentication.
 * - If loading, show spinner
 * - If authenticated with profile, go to /picks
 * - If authenticated without profile, go to /profile-setup
 * - If not authenticated, go to /home
 */
export function AuthRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not signed in - go to home page
  if (!user) {
    return <Navigate to="/home" replace />;
  }

  // Signed in but no profile or missing display_name - go to profile setup
  if (!profile || !profile.display_name) {
    return <Navigate to="/profile-setup" replace />;
  }

  // Fully authenticated with profile - go to picks
  return <Navigate to="/picks" replace />;
}

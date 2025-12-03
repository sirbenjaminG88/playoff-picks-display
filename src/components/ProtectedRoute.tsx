import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedRoute({ children, requireProfile = true }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

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
  if (requireProfile && (!profile || !profile.display_name)) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
}

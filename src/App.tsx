import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LeagueProvider } from "@/contexts/LeagueContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SafeArea } from "@/components/SafeArea";
import { SplashScreen } from '@capacitor/splash-screen';
import { Badge } from '@capawesome/capacitor-badge';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Results from "./pages/Results";
import Picks from "./pages/Picks";
import Admin from "./pages/Admin";
import AdminPlayers from "./pages/AdminPlayers";
import AdminUsers from "./pages/AdminUsers";
import SignIn from "./pages/SignIn";
import ProfileSetup from "./pages/ProfileSetup";
import ResetPassword from "./pages/ResetPassword";
import LeaguesHome from "./pages/LeaguesHome";
import JoinLeague from "./pages/JoinLeague";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Support from "./pages/Support";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

/**
 * AppContent - Main app content with splash screen handling.
 */
const AppContent = () => {
  const { loading } = useAuth();

  // Initialize push notifications
  usePushNotifications();

  // Clear badge immediately on app mount
  useEffect(() => {
    const clearBadgeOnMount = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('[App] Clearing badge on app mount...');
          await Badge.clear();
          console.log('[App] ✅ Badge cleared on mount');
        } catch (error) {
          console.error('[App] ❌ Error clearing badge on mount:', error);
        }
      }
    };

    clearBadgeOnMount();
  }, []);

  useEffect(() => {
    console.log('[AppContent] Auth loading:', loading);

    // Hide splash screen once auth loading is complete
    if (!loading && window.Capacitor) {
      console.log('[AppContent] Auth loaded, hiding splash screen in 500ms');
      // Small delay to ensure render is complete
      setTimeout(() => {
        SplashScreen.hide();
      }, 500);
    }
  }, [loading]);

  // Keep rendering the app even while loading - just hide splash when ready
  return (
    <SafeArea className="min-h-screen flex flex-col bg-background">
      <LeagueProvider>
        <SeasonProvider>
          <div className="flex-1 pb-16">
            <Routes>
            <Route path="/" element={<LeaguesHome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route path="/join/:code" element={<JoinLeague />} />
            <Route 
              path="/results" 
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/picks" 
              element={
                <ProtectedRoute>
                  <Picks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/players" 
              element={
                <AdminRoute>
                  <AdminPlayers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </SeasonProvider>
      </LeagueProvider>
    </SafeArea>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

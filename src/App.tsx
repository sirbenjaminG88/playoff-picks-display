import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SplashScreen as NativeSplashScreen } from "@capacitor/splash-screen";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LeagueProvider } from "@/contexts/LeagueContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { SafeArea } from "@/components/SafeArea";
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

const queryClient = new QueryClient();

/**
 * AppContent - Main app content rendered after auth initialization.
 * Hides native splash when auth is ready.
 */
const AppContent = () => {
  const { loading } = useAuth();

  // Hide native splash when auth is ready
  useEffect(() => {
    if (!loading) {
      NativeSplashScreen.hide().catch(() => {
        // Ignore if running in web or plugin not available
      });
    }
  }, [loading]);

  // Show loading state while auth initializes
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <SafeArea className="min-h-screen flex flex-col bg-background">
      <LeagueProvider>
        <SeasonProvider>
          <div className="flex-1 pb-16">
            <Routes>
            {/* Test route for splash screen - dev only */}
            <Route path="/splash-test" element={<SplashScreen />} />
            <Route path="/" element={<LeaguesHome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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

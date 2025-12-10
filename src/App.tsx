import { useEffect, useState } from "react";
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

const SPLASH_MIN_DURATION_MS = 3000;

/**
 * AppContent - TEMPORARY: Always render SplashScreen for native iOS testing.
 */
const AppContent = () => {
  return <SplashScreen />;
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

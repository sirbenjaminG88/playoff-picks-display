import { Loader2 } from "lucide-react";

/**
 * SplashScreen - Branded loading screen shown during app initialization.
 * Displays EMMA branding while auth/session state is being resolved.
 */
export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 px-8">
        {/* Trophy Icon */}
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-5xl">🏆</span>
        </div>

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            EMMA
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Playoff Picks
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center gap-2 text-muted-foreground mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading your playoff picks…</span>
        </div>
      </div>
    </div>
  );
};

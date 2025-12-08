import { Loader2 } from "lucide-react";

/**
 * AnimatedTrophyIcon - SVG trophy with line-drawing animation.
 */
const AnimatedTrophyIcon = () => {
  return (
    <div className="flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 border border-primary/40">
      <svg
        width="56"
        height="56"
        viewBox="0 0 64 64"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <style>
          {`
            @keyframes draw-stroke {
              from { stroke-dashoffset: 200; }
              to { stroke-dashoffset: 0; }
            }
            .trophy-stroke {
              stroke-dasharray: 200;
              stroke-dashoffset: 200;
              animation: draw-stroke 0.8s ease-out forwards;
            }
          `}
        </style>
        <path
          className="trophy-stroke"
          d="M20 12h24M24 12v10a8 8 0 0 0 16 0V12M16 12v8a12 12 0 0 0 12 12h8a12 12 0 0 0 12-12v-8M26 40h12M24 44h16v6H24z"
        />
      </svg>
    </div>
  );
};

/**
 * SplashScreen - Branded loading screen shown during app initialization.
 * Displays EMMA branding while auth/session state is being resolved.
 */
export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 px-8">
        {/* Animated Trophy Icon */}
        <AnimatedTrophyIcon />

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

import { Home, ClipboardList, Trophy } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Capacitor } from "@capacitor/core";

// TODO: Once the temporary season selector is removed from Submissions/Results headers,
// add the same top-right profile icon used on Home here
// to navigate to /profile for a consistent entry point.

export function BottomNav() {
  const isNative = Capacitor.isNativePlatform();
  
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-nav-bg"
      style={{
        transform: "translateZ(0)", // Hardware acceleration to prevent scroll issues
        paddingBottom: isNative ? "env(safe-area-inset-bottom)" : "0",
      }}
    >
      <div className="border-t border-border">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        <NavLink
          to="/"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-nav-inactive transition-colors"
          activeClassName="text-primary"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs font-medium">Home</span>
        </NavLink>

        <NavLink
          to="/picks"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-nav-inactive transition-colors"
          activeClassName="text-primary"
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs font-medium">Submissions</span>
        </NavLink>

        <NavLink
          to="/results"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-nav-inactive transition-colors"
          activeClassName="text-primary"
        >
          <Trophy className="h-5 w-5" />
          <span className="text-xs font-medium">Results</span>
        </NavLink>
        </div>
      </div>
    </nav>
  );
}

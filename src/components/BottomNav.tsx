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
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        transform: "translateZ(0)", // Hardware acceleration to prevent scroll issues
      }}
    >
      <div className="bg-nav-bg/90 backdrop-blur border-t border-border">
        <div className="flex items-center justify-around h-14 max-w-md mx-auto px-3">
          <NavLink
            to="/"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <Home className="h-6 w-6" />
            <span className="text-[10px] leading-none font-medium">Home</span>
          </NavLink>

          <NavLink
            to="/picks"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-[10px] leading-none font-medium">Submissions</span>
          </NavLink>

          <NavLink
            to="/results"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <Trophy className="h-6 w-6" />
            <span className="text-[10px] leading-none font-medium">Results</span>
          </NavLink>
        </div>
      </div>
      {/* Safe area spacer - fills the home indicator area with nav background */}
      {isNative && (
        <div 
          className="bg-nav-bg"
          style={{ height: "env(safe-area-inset-bottom)" }}
        />
      )}
    </nav>
  );
}

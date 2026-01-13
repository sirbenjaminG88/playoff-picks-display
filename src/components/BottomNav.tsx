import { Home, ClipboardList, Trophy, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";

// TODO: Once the temporary season selector is removed from Submissions/Results headers,
// add the same top-right profile icon used on Home here
// to navigate to /profile for a consistent entry point.

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-nav-bg/90 backdrop-blur border-t border-border"
      style={{
        transform: "translateZ(0)", // Hardware acceleration to prevent scroll issues
        paddingTop: "16px",
        paddingBottom: "55px",
      }}
    >
      <div className="max-w-md mx-auto px-3">
        <div className="flex items-center justify-around h-[60px]">
          <NavLink
            to="/"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <Home className="h-[27px] w-[27px]" />
            <span className="text-[11px] leading-none font-medium">Home</span>
          </NavLink>

          <NavLink
            to="/picks"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <ClipboardList className="h-[27px] w-[27px]" />
            <span className="text-[11px] leading-none font-medium">Submissions</span>
          </NavLink>

          <NavLink
            to="/results"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <Trophy className="h-[27px] w-[27px]" />
            <span className="text-[11px] leading-none font-medium">Results</span>
          </NavLink>

          <NavLink
            to="/players"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-nav-inactive transition-colors"
            activeClassName="text-primary"
          >
            <Users className="h-[27px] w-[27px]" />
            <span className="text-[11px] leading-none font-medium">Players</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

import { Check, ChevronDown, Eye } from "lucide-react";
import { useLeague, LeagueMembership } from "@/contexts/LeagueContext";
import { useAuth } from "@/contexts/AuthContext";
import { LeagueIcon } from "@/components/leagues/LeagueIcon";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LeagueSwitcherProps {
  className?: string;
}

export function LeagueSwitcher({ className }: LeagueSwitcherProps) {
  const { memberships, currentLeague, setCurrentLeagueId, loading, founderMode, setFounderMode, isFounderViewing } = useLeague();
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Check if user has access to regular season beta (member of any REG league)
  const isRegularSeasonBetaTester = memberships.some(m => m.league.season_type === 'REG');
  const filteredMemberships = isRegularSeasonBetaTester
    ? memberships
    : memberships.filter(m => m.league.season_type === 'POST');

  // Don't render if no memberships or still loading
  if (loading || filteredMemberships.length === 0) {
    return null;
  }

  const handleLeagueSelect = (leagueId: string) => {
    setCurrentLeagueId(leagueId);
    setDrawerOpen(false);
  };

  // Truncate league name for trigger button
  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + "…";
  };

  // Founder mode toggle (admin only)
  const FounderModeToggle = () => (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-primary" />
        <Label htmlFor="founder-mode" className="text-sm font-medium cursor-pointer">
          View All Leagues
        </Label>
      </div>
      <Switch
        id="founder-mode"
        checked={founderMode}
        onCheckedChange={setFounderMode}
      />
    </div>
  );

  // Mobile: Bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-muted/50 hover:bg-muted transition-colors",
              "min-h-[44px]", // iOS touch target
              isFounderViewing && "ring-2 ring-primary/50",
              className
            )}
          >
            {isFounderViewing && (
              <Eye className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <LeagueIcon
              iconUrl={currentLeague?.icon_url}
              leagueName={currentLeague?.name || "League"}
              size="sm"
              className="w-6 h-6"
            />
            <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
              {currentLeague?.name ? truncateName(currentLeague.name, 16) : "Select League"}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle>Select League</DrawerTitle>
          </DrawerHeader>
          {isAdmin && <FounderModeToggle />}
          <div className="px-4 pb-8 space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredMemberships.map((membership) => (
              <LeagueOption
                key={membership.league_id}
                membership={membership}
                isSelected={membership.league_id === currentLeague?.id}
                onSelect={handleLeagueSelect}
              />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Standard select dropdown
  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Switch
            id="founder-mode-desktop"
            checked={founderMode}
            onCheckedChange={setFounderMode}
            className="scale-75"
          />
          <Label htmlFor="founder-mode-desktop" className="text-xs text-muted-foreground cursor-pointer">
            All
          </Label>
        </div>
      )}
      <Select
        value={currentLeague?.id || ""}
        onValueChange={handleLeagueSelect}
      >
        <SelectTrigger className={cn(
          "w-[200px] bg-muted/50",
          isFounderViewing && "ring-2 ring-primary/50",
          className
        )}>
          <div className="flex items-center gap-2">
            {isFounderViewing && (
              <Eye className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <LeagueIcon
              iconUrl={currentLeague?.icon_url}
              leagueName={currentLeague?.name || "League"}
              size="sm"
              className="w-5 h-5"
            />
            <SelectValue placeholder="Select league">
              {currentLeague?.name ? truncateName(currentLeague.name, 18) : "Select League"}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-background border-border max-h-[300px]">
          {filteredMemberships.map((membership) => (
            <SelectItem
              key={membership.league_id}
              value={membership.league_id}
              className="py-3"
            >
              <div className="flex items-center gap-2">
                {membership.isFounderView && (
                  <Eye className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <LeagueIcon
                  iconUrl={membership.league.icon_url}
                  leagueName={membership.league.name}
                  size="sm"
                  className="w-5 h-5"
                />
                <span>{membership.league.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// League option for mobile drawer - large touch targets
interface LeagueOptionProps {
  membership: LeagueMembership;
  isSelected: boolean;
  onSelect: (leagueId: string) => void;
}

function LeagueOption({ membership, isSelected, onSelect }: LeagueOptionProps) {
  return (
    <button
      onClick={() => onSelect(membership.league_id)}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl transition-colors",
        "min-h-[56px]", // 48px+ for iOS touch targets
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "bg-muted/30 border border-border hover:bg-muted/50"
      )}
    >
      {membership.isFounderView && (
        <Eye className="w-5 h-5 text-primary flex-shrink-0" />
      )}
      <LeagueIcon
        iconUrl={membership.league.icon_url}
        leagueName={membership.league.name}
        size="sm"
      />
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{membership.league.name}</p>
        <p className="text-xs text-muted-foreground">
          {membership.isFounderView 
            ? `${membership.league.member_count || 0} members · ${membership.league.pick_count || 0} picks`
            : membership.role === "commissioner" 
              ? "Commissioner" 
              : "Member"}
        </p>
      </div>
      {isSelected && (
        <Check className="w-5 h-5 text-primary flex-shrink-0" />
      )}
    </button>
  );
}

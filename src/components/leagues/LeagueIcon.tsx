import {
  Trophy, Goal, Medal, Flame, Zap, Crown, Star, Shield, Swords,
  Pizza, Beer, Skull, Ghost, Rocket, Bomb, PartyPopper, Sparkles,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  trophy: Trophy,
  goal: Goal,
  medal: Medal,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  star: Star,
  shield: Shield,
  swords: Swords,
  pizza: Pizza,
  beer: Beer,
  skull: Skull,
  ghost: Ghost,
  rocket: Rocket,
  bomb: Bomb,
  "party-popper": PartyPopper,
  sparkles: Sparkles,
};

interface LeagueIconProps {
  iconUrl?: string | null;
  leagueName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LeagueIcon({ iconUrl, leagueName, size = "md", className }: LeagueIconProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  // Check if it's a Lucide icon reference (lucide:iconname)
  if (iconUrl?.startsWith("lucide:")) {
    const iconName = iconUrl.replace("lucide:", "");
    const IconComponent = ICON_MAP[iconName] || Trophy;
    
    return (
      <div className={cn(
        "bg-primary/10 rounded-xl flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <IconComponent className={cn("text-primary", iconSizeClasses[size])} />
      </div>
    );
  }

  // Check if it's a URL (AI generated or external image)
  if (iconUrl && (iconUrl.startsWith("http") || iconUrl.startsWith("data:"))) {
    return (
      <div className={cn(
        "bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden",
        sizeClasses[size],
        className
      )}>
        <img src={iconUrl} alt={leagueName} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Default fallback to Trophy
  return (
    <div className={cn(
      "bg-primary/10 rounded-xl flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <Trophy className={cn("text-primary", iconSizeClasses[size])} />
    </div>
  );
}

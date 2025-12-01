import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, ChevronDown } from "lucide-react";
import { PlayerStats } from "@/data/playoffResultsData";
import { calculateFantasyPoints } from "@/lib/utils";

interface PlayerCardProps {
  name: string;
  team: string;
  position: "QB" | "RB" | "WR" | "TE";
  selectedBy: string[];
  photoUrl?: string;
  points?: number | null;
  stats?: PlayerStats;
}

export const PlayerCard = ({ 
  name, 
  team, 
  position, 
  selectedBy, 
  photoUrl, 
  points,
  stats 
}: PlayerCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPositionColor = (pos: string) => {
    switch (pos) {
      case "QB":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "RB":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "WR":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "TE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatStatValue = (value: number | null | undefined) => {
    return value !== null && value !== undefined ? value.toString() : "—";
  };

  const getPositionStats = () => {
    switch (position) {
      case "QB":
        return [
          { label: "Pass Yards", value: formatStatValue(stats?.passYards) },
          { label: "Pass TDs", value: formatStatValue(stats?.passTDs) },
          { label: "Interceptions", value: formatStatValue(stats?.interceptions) },
          { label: "Rush Yards", value: formatStatValue(stats?.rushYards) },
          { label: "Rush TDs", value: formatStatValue(stats?.rushTDs) },
          { label: "Fumbles Lost", value: formatStatValue(stats?.fumblesLost) },
          { label: "2pt Conversions", value: formatStatValue(stats?.twoPtConversions) },
        ];
      case "RB":
        return [
          { label: "Rush Yards", value: formatStatValue(stats?.rushYards) },
          { label: "Rush TDs", value: formatStatValue(stats?.rushTDs) },
          { label: "Rec Yards", value: formatStatValue(stats?.recYards) },
          { label: "Rec TDs", value: formatStatValue(stats?.recTDs) },
          { label: "Fumbles Lost", value: formatStatValue(stats?.fumblesLost) },
          { label: "2pt Conversions", value: formatStatValue(stats?.twoPtConversions) },
        ];
      case "WR":
      case "TE":
        return [
          { label: "Rec Yards", value: formatStatValue(stats?.recYards) },
          { label: "Rec TDs", value: formatStatValue(stats?.recTDs) },
          { label: "Rush Yards", value: formatStatValue(stats?.rushYards) },
          { label: "Rush TDs", value: formatStatValue(stats?.rushTDs) },
          { label: "Fumbles Lost", value: formatStatValue(stats?.fumblesLost) },
          { label: "2pt Conversions", value: formatStatValue(stats?.twoPtConversions) },
        ];
      default:
        return [];
    }
  };

  const calculatedPoints = calculateFantasyPoints(stats);
  const displayPoints = calculatedPoints !== null && calculatedPoints !== undefined ? calculatedPoints.toFixed(1) : "—";

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200 border-2">
      {/* Main Card Content - Always Visible */}
      <div 
        className="flex gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Photo Placeholder */}
        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-muted-foreground" />
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-lg leading-tight truncate">
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{team}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getPositionColor(position)} font-semibold`}>
                {position}
              </Badge>
              <ChevronDown 
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {/* Selected By */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Selected by:</p>
            <div className="flex flex-wrap gap-1">
              {selectedBy.map((user) => (
                <Badge key={user} variant="secondary" className="text-xs">
                  {user}
                </Badge>
              ))}
            </div>
          </div>

          {/* Points */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Points:</span>
            <div className="h-8 px-3 bg-muted rounded border-2 border-dashed border-border flex items-center justify-center min-w-[4rem]">
              <span className="text-sm font-semibold">{displayPoints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Stats Section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-3">
            <h4 className="font-bold text-sm mb-1">Stats for this week</h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Total Points:</span>
              <span className="text-lg font-bold text-primary">{displayPoints}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {getPositionStats().map((stat, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground">{stat.label}:</span>
                <span className="text-sm font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

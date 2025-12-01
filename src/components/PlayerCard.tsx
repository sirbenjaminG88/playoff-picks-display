import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { PlayerPick } from "@/data/picks";

interface PlayerCardProps {
  player: PlayerPick;
}

export const PlayerCard = ({ player }: PlayerCardProps) => {
  const getPositionColor = (position: string) => {
    switch (position) {
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

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2">
      <div className="flex gap-4">
        {/* Photo Placeholder */}
        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-lg leading-tight truncate">
                {player.name}
              </h3>
              <p className="text-sm text-muted-foreground">{player.team}</p>
            </div>
            <Badge className={`${getPositionColor(player.position)} font-semibold`}>
              {player.position}
            </Badge>
          </div>

          {/* Selected By */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Selected by:</p>
            <div className="flex flex-wrap gap-1">
              {player.selectedBy.map((user) => (
                <Badge key={user} variant="secondary" className="text-xs">
                  {user}
                </Badge>
              ))}
            </div>
          </div>

          {/* Points Placeholder */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Points:</span>
            <div className="h-8 w-16 bg-muted rounded border-2 border-dashed border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">—</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

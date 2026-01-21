import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WinProbabilityBadgeProps {
  probability: number;
  display: string;
}

function getColorClass(probability: number): string {
  if (probability >= 0.4) return 'text-green-500'; // >40% - green
  if (probability >= 0.2) return 'text-yellow-500'; // 20-40% - yellow
  return 'text-muted-foreground'; // <20% - gray
}

export function WinProbabilityBadge({ probability, display }: WinProbabilityBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold cursor-help",
            getColorClass(probability)
          )}>
            <span>{display}</span>
            <Info className="h-3 w-3 opacity-60" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] p-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold">Win Probability</p>
            <p className="text-xs text-muted-foreground">
              Calculated using 10,000 Monte Carlo simulations of the remaining playoff weeks. 
              Each simulation randomly assigns player performances based on projected points 
              with variance, respecting the "no repeat player" rule, then determines a winner.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

// CSS filter to convert black to our primary green color
// This uses brightness(0) to make it black, then invert + sepia + hue-rotate to get green
const greenFilter = "brightness(0) saturate(100%) invert(62%) sepia(52%) saturate(501%) hue-rotate(93deg) brightness(94%) contrast(87%)";

export const QBIcon = ({ className }: IconProps) => (
  <img 
    src="/icon-qb.png"
    alt="QB"
    className={cn("w-6 h-6", className)}
    style={{ filter: greenFilter }}
  />
);

export const RBIcon = ({ className }: IconProps) => (
  <img 
    src="/icon-qb.png"
    alt="RB"
    className={cn("w-6 h-6", className)}
    style={{ filter: greenFilter }}
  />
);

export const FlexIcon = ({ className }: IconProps) => (
  <img 
    src="/icon-qb.png"
    alt="Flex"
    className={cn("w-6 h-6", className)}
    style={{ filter: greenFilter }}
  />
);

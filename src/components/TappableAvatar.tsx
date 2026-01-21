import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPicksSheet } from "@/components/UserPicksSheet";
import { getInitials } from "@/lib/displayName";

interface TappableAvatarProps {
  userId: string; // Auth UUID
  displayName: string;
  avatarUrl: string | null;
  leagueId: string;
  totalPoints?: number;
  size?: "sm" | "md" | "lg";
  colorIndex?: number;
  className?: string;
}

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const fallbackTextClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

export function TappableAvatar({
  userId,
  displayName,
  avatarUrl,
  leagueId,
  totalPoints,
  size = "md",
  colorIndex,
  className = "",
}: TappableAvatarProps) {
  const [showSheet, setShowSheet] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSheet(true);
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowSheet(true);
          }
        }}
      >
        <Avatar className={`${sizeClasses[size]} flex-shrink-0`}>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback
            colorIndex={colorIndex}
            className={`font-semibold ${fallbackTextClasses[size]}`}
          >
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <UserPicksSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        userId={userId}
        displayName={displayName}
        avatarUrl={avatarUrl}
        leagueId={leagueId}
        totalPoints={totalPoints}
        colorIndex={colorIndex}
      />
    </>
  );
}

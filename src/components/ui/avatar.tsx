import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import { getAvatarColor, getAvatarColorByIndex } from "@/lib/avatarColors";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  /** Name used to generate a hash-based background color (fallback if colorIndex not provided) */
  name?: string;
  /** Sequential color index for league-aware coloring (takes precedence over name) */
  colorIndex?: number;
}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, name, colorIndex, style, ...props }, ref) => {
  // Prefer colorIndex (sequential) over name (hash-based)
  const backgroundColor = 
    colorIndex !== undefined 
      ? getAvatarColorByIndex(colorIndex)
      : name 
        ? getAvatarColor(name) 
        : undefined;
  
  const colorStyle = backgroundColor
    ? { backgroundColor, color: 'white', ...style }
    : style;

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        !backgroundColor && "bg-muted",
        className
      )}
      style={colorStyle}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };

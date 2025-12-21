import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export const QBIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={cn("w-5 h-5", className)}
  >
    {/* Quarterback throwing silhouette */}
    <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm7 7l-2.5-1.5c-.3-.2-.7-.1-.9.2l-1.1 1.8-1.5-.9V6h-2v2.6l-1.5.9-1.1-1.8c-.2-.3-.6-.4-.9-.2L5 9c-.3.2-.4.6-.2.9l2 3.1-1.3 4c-.1.4.1.8.5.9.4.1.8-.1.9-.5l1.4-4.4 2.2 1.3v6.7h2v-6.7l2.2-1.3 1.4 4.4c.1.4.5.6.9.5.4-.1.6-.5.5-.9l-1.3-4 2-3.1c.2-.3.1-.7-.2-.9z"/>
    {/* Football in throwing hand */}
    <ellipse cx="18" cy="6" rx="1.5" ry="1" transform="rotate(-30 18 6)"/>
  </svg>
);

export const RBIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={cn("w-5 h-5", className)}
  >
    {/* Running back silhouette - dynamic running pose */}
    <path d="M13.5 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 7.5l-2-1c-.3-.1-.6 0-.8.2l-1.2 1.8-2-.8V7h-2v2.5l-1.5.5-1.5-2c-.2-.3-.5-.3-.8-.2l-2 1c-.3.2-.4.5-.3.8l1.5 3.5-2.4 4.5c-.2.4 0 .8.4 1 .4.2.8 0 1-.4l2.5-4.7 1.8.7-.5 4.8c0 .4.3.8.7.8.4 0 .7-.3.8-.7l.5-5.3 2.2.9 1.5 4.7c.1.4.5.6.9.4.4-.1.6-.5.4-.9l-1.5-5-1.3-3 1-1.5 1.5.8 1.2 2c.2.3.5.4.8.3.4-.1.6-.5.5-.9l-1.5-3c-.1-.3-.4-.5-.7-.5z"/>
    {/* Football tucked */}
    <ellipse cx="8" cy="11" rx="1.2" ry=".8" transform="rotate(20 8 11)"/>
  </svg>
);

export const FlexIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={cn("w-5 h-5", className)}
  >
    {/* Receiver catching silhouette - reaching up for catch */}
    <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm6.5 4l-1 .5c-.3.1-.4.4-.3.7l.8 1.8-3 1.5V8h-2v2.7l-3-1.5.8-1.8c.1-.3 0-.6-.3-.7l-1-.5c-.3-.1-.6 0-.8.3l-1.2 2.5c-.1.3 0 .6.2.8l2.8 2v3l-2 5c-.2.4 0 .8.4 1 .4.2.8 0 1-.4l2.1-5.1h2l2.1 5.1c.2.4.6.5 1 .4.4-.2.5-.6.4-1l-2-5v-3l2.8-2c.3-.2.4-.5.2-.8l-1.2-2.5c-.2-.3-.5-.4-.8-.3z"/>
    {/* Football above hands */}
    <ellipse cx="12" cy="3" rx="1.2" ry=".8"/>
  </svg>
);

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export const QBIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
  >
    {/* Head */}
    <circle cx="12" cy="4" r="2.5" fill="currentColor" stroke="none" />
    {/* Body */}
    <line x1="12" y1="6.5" x2="12" y2="14" />
    {/* Throwing arm (right) - raised up and back */}
    <line x1="12" y1="8" x2="18" y2="5" />
    {/* Football at hand */}
    <ellipse cx="19.5" cy="4" rx="1.8" ry="1" transform="rotate(-20 19.5 4)" fill="currentColor" stroke="none" />
    {/* Left arm - down/forward */}
    <line x1="12" y1="8" x2="7" y2="11" />
    {/* Left leg */}
    <line x1="12" y1="14" x2="8" y2="22" />
    {/* Right leg */}
    <line x1="12" y1="14" x2="16" y2="22" />
  </svg>
);

export const RBIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
  >
    {/* Head */}
    <circle cx="10" cy="4" r="2.5" fill="currentColor" stroke="none" />
    {/* Body - leaning forward */}
    <line x1="10" y1="6.5" x2="12" y2="13" />
    {/* Right arm - forward */}
    <line x1="11" y1="8" x2="16" y2="6" />
    {/* Left arm - tucking ball */}
    <line x1="11" y1="8" x2="7" y2="10" />
    {/* Football tucked */}
    <ellipse cx="6" cy="11" rx="1.5" ry="1" transform="rotate(30 6 11)" fill="currentColor" stroke="none" />
    {/* Back leg */}
    <line x1="12" y1="13" x2="6" y2="21" />
    {/* Front leg - extended */}
    <line x1="12" y1="13" x2="18" y2="20" />
  </svg>
);

export const FlexIcon = ({ className }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
  >
    {/* Head */}
    <circle cx="12" cy="5" r="2.5" fill="currentColor" stroke="none" />
    {/* Body */}
    <line x1="12" y1="7.5" x2="12" y2="14" />
    {/* Both arms reaching up */}
    <line x1="12" y1="9" x2="7" y2="4" />
    <line x1="12" y1="9" x2="17" y2="4" />
    {/* Football above - being caught */}
    <ellipse cx="12" cy="1.5" rx="1.8" ry="1" fill="currentColor" stroke="none" />
    {/* Left leg */}
    <line x1="12" y1="14" x2="8" y2="22" />
    {/* Right leg */}
    <line x1="12" y1="14" x2="16" y2="22" />
  </svg>
);

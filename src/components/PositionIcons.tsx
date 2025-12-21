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
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
  >
    {/* Hand/arm throwing */}
    <path d="M4 16 C6 14, 8 12, 10 11 C11 10.5, 11.5 10, 12 10" />
    {/* Fingers */}
    <path d="M12 10 C12.5 9, 13 8, 13.5 7" />
    <path d="M12 10 C13 9.5, 14 9, 15 8.5" />
    <path d="M12 10 C13 10, 14.5 10, 16 10" />
    {/* Football */}
    <ellipse cx="18" cy="6" rx="3" ry="1.8" transform="rotate(-30 18 6)" fill="currentColor" stroke="none" />
    {/* Laces on football */}
    <path d="M16.5 5.5 L17.2 5.8 M17.5 5 L18.2 5.3 M18.5 4.5 L19.2 4.8" strokeWidth="0.8" />
    {/* Motion lines */}
    <line x1="20" y1="8" x2="22" y2="9" strokeWidth="1" />
    <line x1="20.5" y1="9.5" x2="22.5" y2="10.5" strokeWidth="1" />
    <line x1="21" y1="11" x2="23" y2="12" strokeWidth="1" />
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

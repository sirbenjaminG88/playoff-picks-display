import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/displayName";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

export function PageHeader({ title, subtitle, icon }: PageHeaderProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Title row with profile button */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            {icon}
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          </div>
          
          {/* Profile Button */}
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center justify-center w-9 h-9 bg-card border border-border rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Profile"
          >
            <Avatar className="h-6 w-6">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.display_name || ""} />
              ) : (
                <AvatarFallback className="bg-foreground/80 text-background text-xs font-medium">
                  {profile?.display_name ? getInitials(profile.display_name) : "?"}
                </AvatarFallback>
              )}
            </Avatar>
          </button>
        </div>
        
        {/* Subtitle */}
        <p className="text-muted-foreground text-sm mb-4">{subtitle}</p>
        
        {/* League Switcher */}
        <LeagueSwitcher />
      </div>
    </header>
  );
}

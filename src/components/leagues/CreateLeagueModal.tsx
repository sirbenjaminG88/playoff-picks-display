import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, Users, Loader2, Share2, Copy, Check,
  // Football icons
  Goal, Medal, Flame, Zap, Crown, Star, Shield, Swords,
  // Fun random icons
  Pizza, Beer, Skull, Ghost, Rocket, Bomb, PartyPopper, Sparkles,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateLeagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalStep = "form" | "success";

interface CreatedLeague {
  id: string;
  name: string;
  join_code: string;
}

// Icon options with their Lucide component and name
const LEAGUE_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  // Football/Sports
  { name: "trophy", icon: Trophy, label: "Trophy" },
  { name: "goal", icon: Goal, label: "Goal" },
  { name: "medal", icon: Medal, label: "Medal" },
  { name: "flame", icon: Flame, label: "Flame" },
  { name: "zap", icon: Zap, label: "Lightning" },
  { name: "crown", icon: Crown, label: "Crown" },
  { name: "star", icon: Star, label: "Star" },
  { name: "shield", icon: Shield, label: "Shield" },
  { name: "swords", icon: Swords, label: "Swords" },
  // Fun random
  { name: "pizza", icon: Pizza, label: "Pizza" },
  { name: "beer", icon: Beer, label: "Beer" },
  { name: "skull", icon: Skull, label: "Skull" },
  { name: "ghost", icon: Ghost, label: "Ghost" },
  { name: "rocket", icon: Rocket, label: "Rocket" },
  { name: "bomb", icon: Bomb, label: "Bomb" },
  { name: "party-popper", icon: PartyPopper, label: "Party" },
  { name: "sparkles", icon: Sparkles, label: "Sparkles" },
];

export function CreateLeagueModal({ open, onOpenChange }: CreateLeagueModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<ModalStep>("form");
  const [leagueName, setLeagueName] = useState("");
  const [maxMembers, setMaxMembers] = useState(4);
  const [selectedIcon, setSelectedIcon] = useState("trophy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<CreatedLeague | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setStep("form");
    setLeagueName("");
    setMaxMembers(4);
    setSelectedIcon("trophy");
    setCreatedLeague(null);
    setCopied(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after animation
    setTimeout(resetForm, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be signed in to create a league");
      return;
    }

    const trimmedName = leagueName.trim();
    if (!trimmedName) {
      toast.error("Please enter a league name");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("League name must be 50 characters or less");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate join code
      const { data: joinCodeData, error: joinCodeError } = await supabase
        .rpc("generate_funny_join_code");

      if (joinCodeError) throw joinCodeError;

      const joinCode = joinCodeData as string;

      // Create league with selected icon stored in icon_url field
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .insert({
          name: trimmedName,
          season: 2025,
          season_type: "POST",
          join_code: joinCode,
          max_members: maxMembers,
          icon_url: `lucide:${selectedIcon}`, // Store as lucide:iconname
        })
        .select("id, name, join_code")
        .single();

      if (leagueError) throw leagueError;

      // Add creator as commissioner
      const { error: memberError } = await supabase
        .from("league_members")
        .insert({
          league_id: leagueData.id,
          user_id: user.id,
          role: "commissioner",
        });

      if (memberError) throw memberError;

      setCreatedLeague(leagueData);
      setStep("success");
      toast.success("League created!");
    } catch (error: any) {
      console.error("Error creating league:", error);
      toast.error(error.message || "Failed to create league");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${createdLeague?.join_code}`;
  };

  const getShareText = () => {
    return `Join my "${createdLeague?.name}" playoff fantasy league on EMMA!\n\nJoin code: ${createdLeague?.join_code}\n\nDownload EMMA and enter this code to join!`;
  };

  const handleShare = async () => {
    // For native iOS share, we want to share the full message with URL
    const shareData = {
      title: `Join "${createdLeague?.name}" on EMMA`,
      text: getShareText(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: any) {
        // User cancelled - do nothing
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fall back to copy on actual errors
          handleCopy();
        }
      }
    } else {
      // Web fallback - just copy the link
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdLeague?.join_code || '');
      setCopied(true);
      toast.success("Join code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleGoToLeague = () => {
    handleClose();
    if (createdLeague) {
      navigate(`/picks?league=${createdLeague.id}`);
    }
  };

  const SelectedIconComponent = LEAGUE_ICONS.find(i => i.name === selectedIcon)?.icon || Trophy;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SelectedIconComponent className="w-5 h-5 text-primary" />
            {step === "form" ? "Create New League" : "League Created!"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* League Name */}
            <div className="space-y-2">
              <Label htmlFor="league-name">League Name</Label>
              <Input
                id="league-name"
                placeholder="e.g., The Playoff Pros"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                maxLength={50}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {leagueName.length}/50 characters
              </p>
            </div>

            {/* Icon Picker */}
            <div className="space-y-3">
              <Label>League Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {LEAGUE_ICONS.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedIcon(name)}
                    disabled={isSubmitting}
                    className={cn(
                      "flex items-center justify-center p-2.5 rounded-lg border-2 transition-all",
                      selectedIcon === name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                    title={label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Max Members Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Max Members</Label>
                <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{maxMembers}</span>
                </div>
              </div>
              <Slider
                value={[maxMembers]}
                onValueChange={(value) => setMaxMembers(value[0])}
                min={4}
                max={12}
                step={1}
                disabled={isSubmitting}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>4</span>
                <span>12</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create League"
              )}
            </Button>
          </form>
        )}

        {step === "success" && createdLeague && (
          <div className="space-y-6">
            {/* Join Code Display */}
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Your join code is</p>
              <div className="bg-primary/10 border-2 border-primary/20 rounded-xl px-6 py-4 inline-block">
                <span className="text-2xl font-bold text-primary tracking-wide">
                  {createdLeague.join_code}
                </span>
              </div>
            </div>

            {/* Share/Copy Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleShare} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* Invite Instructions */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground text-center">
                Share the join code with your friends to invite them to the league!
              </p>
            </div>

            {/* Go to League Button */}
            <Button onClick={handleGoToLeague} variant="secondary" className="w-full">
              Go to League
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

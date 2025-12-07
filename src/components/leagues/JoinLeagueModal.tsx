import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JoinLeagueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinLeagueModal({ open, onOpenChange }: JoinLeagueModalProps) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setJoinCode("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) return;

    setIsSubmitting(true);
    
    // Navigate to the join page with the code
    handleClose();
    navigate(`/join/${trimmedCode}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Join a League
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="join-code">Enter Join Code</Label>
            <Input
              id="join-code"
              placeholder="e.g., BlitzBurrito"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
            />
            <p className="text-xs text-muted-foreground">
              Ask your league commissioner for the join code
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !joinCode.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Looking up...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

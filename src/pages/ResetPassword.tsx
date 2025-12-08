import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";

// Validation schema - keep in sync with SignIn.tsx
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

type PageState = "loading" | "invalid" | "form" | "success";

const ResetPassword = () => {
  const navigate = useNavigate();
  
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has a valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setPageState("invalid");
        } else {
          setPageState("form");
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setPageState("invalid");
      }
    };

    checkSession();
  }, []);

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    
    if (message.includes("rate limit")) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    if (message.includes("same as") || message.includes("different")) {
      return "New password must be different from your current password.";
    }
    if (message.includes("password")) {
      return "Password does not meet requirements.";
    }
    
    return "An error occurred while updating your password. Please try again.";
  };

  const validateForm = (): boolean => {
    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return false;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setPageState("success");
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    navigate("/signin", { replace: true });
  };

  // Loading state while checking session
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border bg-card">
            <CardContent className="py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Checking link…</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Invalid/expired link state
  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border bg-card">
            <CardHeader className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-2xl mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground">
                  Invalid or expired link
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  This password reset link is invalid or has expired. Please request a new one.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full h-12"
                onClick={handleBackToSignIn}
              >
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border bg-card">
            <CardHeader className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground">
                  Password updated
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  Your password has been successfully reset. You can now sign in with your new password.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full h-12"
                onClick={handleBackToSignIn}
              >
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mx-auto shadow-lg">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                EMMA
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Set your new password
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* New Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-border h-12"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-background border-border h-12"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Set new password"
                )}
              </Button>
            </form>
            
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSignIn}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

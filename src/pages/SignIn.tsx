import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Mail, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().trim().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

type AuthMode = "signin" | "signup";

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the redirect location from state
  const locationState = location.state as { from?: string; action?: string } | null;

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      if (!profile || !profile.display_name) {
        navigate("/profile-setup", { replace: true, state: locationState });
      } else {
        const redirectTo = locationState?.from || "/";
        navigate(redirectTo, { replace: true, state: { action: locationState?.action } });
      }
    }
  }, [user, profile, authLoading, navigate, locationState]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const validateForm = (): boolean => {
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return false;
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return false;
    }

    // For signup, check password confirmation
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    
    // Map Supabase errors to user-friendly messages
    if (message.includes("invalid login credentials")) {
      return "Invalid email or password. Please try again.";
    }
    if (message.includes("email not confirmed")) {
      return "Please check your email to confirm your account.";
    }
    if (message.includes("user already registered")) {
      return "An account with this email already exists. Try signing in instead.";
    }
    if (message.includes("rate limit")) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    if (message.includes("password")) {
      return "Password does not meet requirements.";
    }
    
    // Return generic message for unknown errors
    return "An error occurred. Please try again.";
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }
    // Success - auth state change will trigger redirect
  };

  const handleSignUp = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }
    // Success - with auto-confirm enabled, user will be signed in automatically
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        await handleSignIn();
      } else {
        await handleSignUp();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setConfirmPassword("");
  };

  // TODO: Password reset - Add "Forgot password?" link here that triggers
  // supabase.auth.resetPasswordForEmail(email) and shows a success message

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
                {mode === "signin" ? "Sign in to your account" : "Create a new account"}
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
              
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-border h-12"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background border-border h-12"
                    disabled={loading}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                )}
              </div>

              {/* Confirm Password Field (Sign Up only) */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-background border-border h-12"
                      disabled={loading}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              )}

              {/* TODO: Password reset - Uncomment when implementing forgot password
              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              */}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || !email || !password || (mode === "signup" && !confirmPassword)}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  mode === "signin" ? "Sign in" : "Create account"
                )}
              </Button>
            </form>

            {/* Mode Toggle */}
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-1 text-primary font-medium hover:underline"
                  disabled={loading}
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
            
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;

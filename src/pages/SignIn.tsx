import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Lock } from "lucide-react";

const emailSchema = z.string().email("Please enter a valid email address");

// Test accounts for development/preview mode
const TEST_ACCOUNTS: Record<string, string> = {
  "test1@emma.dev": "testpass123",
  "test2@emma.dev": "testpass123",
  "test3@emma.dev": "testpass123",
  "test4@emma.dev": "testpass123",
  "test5@emma.dev": "testpass123",
  "test6@emma.dev": "testpass123",
  "test7@emma.dev": "testpass123",
  "test8@emma.dev": "testpass123",
  "test9@emma.dev": "testpass123",
  "test10@emma.dev": "testpass123",
};

const TEST_ACCOUNT_EMAILS = Object.keys(TEST_ACCOUNTS);

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const emailLower = email.toLowerCase();
  const isTestEmail = emailLower in TEST_ACCOUNTS;
  const testPassword = TEST_ACCOUNTS[emailLower];

  // Get the redirect location from state
  const locationState = location.state as { from?: string; action?: string } | null;

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      if (!profile || !profile.display_name) {
        navigate("/profile-setup", { replace: true, state: locationState });
      } else {
        // Redirect to the original location or default to /picks
        const redirectTo = locationState?.from || "/picks";
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Test account uses password auth
      if (isTestEmail && testPassword) {
        if (password !== testPassword) {
          setError("Invalid test password");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password: testPassword,
        });

        if (error) {
          // If user doesn't exist, create them
          if (error.message.includes("Invalid login credentials")) {
            const { error: signUpError } = await supabase.auth.signUp({
              email: emailLower,
              password: testPassword,
            });
            if (signUpError) {
              setError(signUpError.message);
            }
            // Auto-confirm is enabled, so they should be signed in
          } else {
            setError(error.message);
          }
        }
        setLoading(false);
        return;
      }

      // Normal magic link flow
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes("rate limit")) {
          setError("Too many requests. Please wait a moment and try again.");
        } else {
          setError(error.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
                Sign in to join the league
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Check your email</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a magic link to <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click the link in your email to sign in.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                >
                  Try a different email
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quick Test Account Selector */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                  <p className="text-sm font-medium text-primary">Quick Sign In (Dev Mode)</p>
                  <Select
                    onValueChange={(value) => {
                      setEmail(value);
                      setPassword("testpass123");
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a test account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_ACCOUNT_EMAILS.map((email) => (
                        <SelectItem key={email} value={email}>
                          {email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isTestEmail && (
                    <Button
                      type="button"
                      className="w-full"
                      disabled={loading}
                      onClick={handleSignIn}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        `Sign in as ${email}`
                      )}
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or use email</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
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
                        className="pl-10 bg-background border-border"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  {/* Password field for test account only */}
                  {isTestEmail && (
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium text-foreground">
                        Test Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter test password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-background border-border"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !email || (isTestEmail && !password)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isTestEmail ? "Signing in..." : "Sending..."}
                      </>
                    ) : (
                      isTestEmail ? "Sign in (Test Mode)" : "Send magic link"
                    )}
                  </Button>
                </form>
              </div>
            )}
            
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/home")}
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

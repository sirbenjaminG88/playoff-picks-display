import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// TODO: Biometric login - After successful email/password login, consider storing
// credentials securely (via Capacitor Secure Storage) to enable Face ID/Touch ID login

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    // Use public_profiles view to avoid exposing email
    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    return data !== null;
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
    
    const adminStatus = await checkAdminRole(user.id);
    setIsAdmin(adminStatus);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to prevent deadlocks
        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            
            const adminStatus = await checkAdminRole(session.user.id);
            setIsAdmin(adminStatus);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
        
        const adminStatus = await checkAdminRole(session.user.id);
        setIsAdmin(adminStatus);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // TODO: Biometric login - Clear any stored biometric credentials here
    // TODO: Account deletion - This is where account deletion would call
    // supabase.rpc('delete_user_account') before signing out
    
    await supabase.auth.signOut();
    
    // Clear all user-specific state
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  }, []);

  /**
   * Request a password reset email for the given email address.
   * Uses Supabase's built-in password reset flow.
   * 
   * TODO: Reset password confirm - Create a `/reset-password` page that:
   *   1. Detects the recovery token from URL (Supabase adds it automatically)
   *   2. Lets user enter a new password
   *   3. Calls supabase.auth.updateUser({ password: newPassword })
   */
  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    
    // TODO: Reset password confirm - Update this URL when the confirm page is created
    // The user will be redirected here after clicking the email link
    const redirectTo = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isAdmin, 
      loading, 
      signOut, 
      refreshProfile,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

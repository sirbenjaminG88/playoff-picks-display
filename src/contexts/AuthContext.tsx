import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_SERVER = 'emma-app';
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
    console.log('[AuthContext] Setting up auth...');

    // Safety timeout: Stop loading after 8 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      console.log('[AuthContext] Safety timeout - forcing loading to false');
      setLoading(false);
    }, 8000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to prevent deadlocks
        if (session?.user) {
          setTimeout(async () => {
            try {
              const profileData = await fetchProfile(session.user.id);
              setProfile(profileData);

              const adminStatus = await checkAdminRole(session.user.id);
              setIsAdmin(adminStatus);
              console.log('[AuthContext] Auth loaded (from listener)');
            } catch (error) {
              console.error('[AuthContext] Error loading profile:', error);
            }
            clearTimeout(safetyTimeout);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          console.log('[AuthContext] No session, auth loaded');
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] Got session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);

          const adminStatus = await checkAdminRole(session.user.id);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('[AuthContext] Error loading profile:', error);
        }
      }
      console.log('[AuthContext] Auth loaded (from getSession)');
      clearTimeout(safetyTimeout);
      setLoading(false);
    }).catch((error) => {
      console.error('[AuthContext] Error getting session:', error);
      clearTimeout(safetyTimeout);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    // Clear biometric credentials on sign out
    try {
      if (Capacitor.isNativePlatform()) {
        const module = await import('@capgo/capacitor-native-biometric');
        await module.NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
      }
      await Preferences.remove({ key: BIOMETRIC_CREDENTIALS_KEY });
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
    
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

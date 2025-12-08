import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * useAccountDeletion - Centralized hook for account deletion
 * 
 * This is the SINGLE SOURCE OF TRUTH for account deletion logic in the app.
 * Both Settings and Profile pages should use this hook.
 * 
 * The deletion process:
 * 1. Calls the delete_user_account() RPC which removes all user data from public schema
 * 2. Signs out the user
 * 3. Returns success/error state for UI handling
 */
export function useAccountDeletion() {
  const { signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async (): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      // Call the RPC function that deletes all user data
      const { error: rpcError } = await supabase.rpc("delete_user_account");

      if (rpcError) {
        console.error("Error deleting account:", rpcError);
        
        // Map common errors to user-friendly messages
        if (rpcError.message.includes("Not authenticated")) {
          setError("You must be signed in to delete your account.");
        } else {
          setError("Something went wrong while deleting your account. Please try again.");
        }
        return false;
      }

      // Sign out the user after successful deletion
      await signOut();
      
      return true;
    } catch (err: any) {
      console.error("Error deleting account:", err);
      setError("Something went wrong while deleting your account. Please try again.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    deleteAccount,
    isDeleting,
    error,
    clearError,
  };
}

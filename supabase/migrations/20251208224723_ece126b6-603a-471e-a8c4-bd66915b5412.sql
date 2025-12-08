-- Create a security definer function to delete a user's account and all related data
-- This function must be called by the authenticated user themselves
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID from auth context
  current_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete user's picks
  DELETE FROM public.user_picks WHERE auth_user_id = current_user_id;
  
  -- Delete user's league memberships
  DELETE FROM public.league_members WHERE user_id = current_user_id;
  
  -- Delete user's roles
  DELETE FROM public.user_roles WHERE user_id = current_user_id;
  
  -- Delete from users table
  DELETE FROM public.users WHERE id = current_user_id;
  
  -- Delete from profiles table
  DELETE FROM public.profiles WHERE id = current_user_id;
  
  -- Note: The auth.users record will be deleted by Supabase when the user
  -- is signed out and their session is invalidated. For complete deletion
  -- of auth.users, an admin API call would be needed via an edge function.
  -- For now, we delete all public schema data which effectively removes
  -- the user from the application.
END;
$$;
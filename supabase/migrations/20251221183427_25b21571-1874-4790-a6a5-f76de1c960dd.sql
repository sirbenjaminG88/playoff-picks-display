-- Fix 1: Ensure users table SELECT policy is properly PERMISSIVE (restricts to own record)
DROP POLICY IF EXISTS "Users can view own user record" ON public.users;
CREATE POLICY "Users can view own user record" 
ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Fix 2: Remove public access to pick_reminder_sent_log
-- Service role bypasses RLS anyway, so removing this policy blocks all regular user access
DROP POLICY IF EXISTS "Service role can manage reminder logs" ON public.pick_reminder_sent_log;
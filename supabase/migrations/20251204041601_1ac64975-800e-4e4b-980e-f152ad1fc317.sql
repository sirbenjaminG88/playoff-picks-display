-- Add a new column for the actual user UUID
ALTER TABLE public.user_picks ADD COLUMN auth_user_id uuid;

-- Update existing picks by matching display_name to users table
UPDATE public.user_picks up
SET auth_user_id = u.id
FROM public.users u
WHERE up.user_id = u.display_name;

-- Also try to match the lowercase versions for legacy data
UPDATE public.user_picks up
SET auth_user_id = u.id
FROM public.users u
WHERE up.auth_user_id IS NULL 
AND LOWER(up.user_id) = LOWER(u.display_name);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can delete own picks" ON public.user_picks;
DROP POLICY IF EXISTS "Users can insert own picks" ON public.user_picks;
DROP POLICY IF EXISTS "Users can update own picks" ON public.user_picks;

-- Create new RLS policies using auth_user_id
CREATE POLICY "Users can insert own picks" 
ON public.user_picks 
FOR INSERT 
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can update own picks" 
ON public.user_picks 
FOR UPDATE 
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can delete own picks" 
ON public.user_picks 
FOR DELETE 
USING (auth_user_id = auth.uid());
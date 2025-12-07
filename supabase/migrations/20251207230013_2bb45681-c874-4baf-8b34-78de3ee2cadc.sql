-- Add join_code and max_members columns to leagues
ALTER TABLE public.leagues 
ADD COLUMN join_code TEXT UNIQUE,
ADD COLUMN max_members INTEGER DEFAULT 4 CHECK (max_members >= 4 AND max_members <= 12);

-- Create function to generate funny join codes
CREATE OR REPLACE FUNCTION public.generate_funny_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  football_terms TEXT[] := ARRAY['Blitz', 'Fumble', 'Sack', 'Touchdown', 'Shotgun', 'Audible', 'Redzone', 'Hailmary', 'Scramble', 'Punt', 'Snap', 'Huddle', 'Tackle', 'Gridiron', 'Pigskin'];
  funny_nouns TEXT[] := ARRAY['Walrus', 'Burrito', 'Penguin', 'Taco', 'Platypus', 'Narwhal', 'Waffle', 'Pickle', 'Mango', 'Pretzel', 'Noodle', 'Biscuit', 'Churro', 'Dumpling', 'Avocado'];
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := football_terms[1 + floor(random() * array_length(football_terms, 1))::int] 
             || funny_nouns[1 + floor(random() * array_length(funny_nouns, 1))::int];
    
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE join_code = new_code) THEN
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Fallback: append random number
      RETURN new_code || floor(random() * 1000)::text;
    END IF;
  END LOOP;
END;
$$;

-- RLS policy: Authenticated users can create leagues
CREATE POLICY "Authenticated users can create leagues"
ON public.leagues
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policy: Users can add themselves to leagues as commissioner (when creating) or player (when joining)
CREATE POLICY "Users can join leagues"
ON public.league_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
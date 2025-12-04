-- 1. Create league_role enum
CREATE TYPE public.league_role AS ENUM ('commissioner', 'player');

-- 2. Create users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user record"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own user record"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Create leagues table
CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season integer NOT NULL,
  season_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read leagues"
  ON public.leagues
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Create league_members join table
CREATE TABLE public.league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role public.league_role NOT NULL DEFAULT 'player',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (league_id, user_id)
);

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own memberships"
  ON public.league_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Insert the beta league
INSERT INTO public.leagues (name, season, season_type)
VALUES ('2025 Regular Season Beta Test', 2025, 'REG')
ON CONFLICT DO NOTHING;

-- 6. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beta_league_id uuid;
  member_role league_role;
BEGIN
  -- Get beta league ID
  SELECT id INTO beta_league_id
  FROM public.leagues
  WHERE name = '2025 Regular Season Beta Test'
  LIMIT 1;

  -- Insert into users table
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Also maintain profiles table for backwards compatibility
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Assign admin role if email matches
  IF NEW.email = 'benjaminmgold@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    member_role := 'commissioner';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'player')
    ON CONFLICT (user_id, role) DO NOTHING;
    member_role := 'player';
  END IF;

  -- Add to beta league if it exists
  IF beta_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id, role)
    VALUES (beta_league_id, NEW.id, member_role)
    ON CONFLICT (league_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Backfill existing auth users into users table
INSERT INTO public.users (id, email, created_at)
SELECT id, email, created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Copy display_name and avatar_url from profiles if they exist
UPDATE public.users u
SET 
  display_name = p.display_name,
  avatar_url = p.avatar_url
FROM public.profiles p
WHERE u.id = p.id;

-- 8. Attach existing users to the beta league
INSERT INTO public.league_members (league_id, user_id, role)
SELECT
  l.id,
  u.id,
  CASE WHEN u.email = 'benjaminmgold@gmail.com' THEN 'commissioner'::league_role ELSE 'player'::league_role END
FROM public.users u
CROSS JOIN public.leagues l
WHERE l.name = '2025 Regular Season Beta Test'
ON CONFLICT (league_id, user_id) DO NOTHING;
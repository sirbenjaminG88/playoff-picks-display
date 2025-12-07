-- Add icon_url column to leagues table for AI-generated icons
ALTER TABLE public.leagues 
ADD COLUMN icon_url TEXT DEFAULT NULL;
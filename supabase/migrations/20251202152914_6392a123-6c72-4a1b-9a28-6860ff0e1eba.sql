-- Allow anyone to delete picks (for testing - no auth yet)
CREATE POLICY "Anyone can delete picks" ON public.user_picks FOR DELETE USING (true);
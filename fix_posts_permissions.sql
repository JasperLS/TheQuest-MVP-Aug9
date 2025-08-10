-- Fix Posts Permission Issue
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on posts table (if not already enabled)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "posts: public select" ON public.posts;
DROP POLICY IF EXISTS "posts: insert own" ON public.posts;
DROP POLICY IF EXISTS "posts: update own" ON public.posts;
DROP POLICY IF EXISTS "posts: delete own" ON public.posts;

-- 3. Recreate the policies
CREATE POLICY "posts: public select"
  ON public.posts FOR SELECT TO public USING (true);

CREATE POLICY "posts: insert own"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts: update own"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts: delete own"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.posts TO authenticated;
GRANT INSERT ON public.posts TO authenticated;
GRANT UPDATE ON public.posts TO authenticated;
GRANT DELETE ON public.posts TO authenticated;

-- 5. Also grant permissions to related tables
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.animals TO anon;
GRANT SELECT ON public.likes TO anon;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.animals TO authenticated;
GRANT ALL ON public.likes TO authenticated;

-- 6. Verify the setup
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename = 'posts';

-- 7. Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'posts';

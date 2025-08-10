DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Remove all existing policies on storage.objects
DROP POLICY IF EXISTS "storage: public select posts" ON storage.objects;
DROP POLICY IF EXISTS "storage: insert posts by owner" ON storage.objects;
DROP POLICY IF EXISTS "storage: update posts by owner" ON storage.objects;
DROP POLICY IF EXISTS "storage: public select profiles" ON storage.objects;
DROP POLICY IF EXISTS "storage: insert profiles by owner" ON storage.objects;
DROP POLICY IF EXISTS "storage: update profiles by owner" ON storage.objects;


-- ========================================
-- Wildlife Social App – Full Schema (Supabase)
-- ========================================
-- Notes:
--  - OpenAI calls are server-side via Edge Function (service role)
--  - rarity_level and quality are integers 1..10
--  - usernames are unique case-insensitively (username_ci)
--  - profiles include a user-chosen display_name for people search
--  - animals/badges/user_badges writes should be server-side
-- ========================================

-- Optional cleanup for dev (comment out in prod)
-- drop schema if exists public cascade;
-- create schema public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- ENUMS (idempotent)
-- ========================================
DO $$
BEGIN
  CREATE TYPE public.notification_type AS ENUM
    ('like','comment','follow','new_post','badge','system');
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- already exists
END
$$;

-- ========================================
-- TABLES
-- ========================================

-- Profiles (backed by auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text NOT NULL UNIQUE,                              -- handle (input)
  username_ci     text GENERATED ALWAYS AS (lower(username)) STORED, -- case-insensitive handle
  display_name    text,                                              -- friendly name (e.g. "John Doe")
  email           text,
  profile_image_url text,
  points          int NOT NULL DEFAULT 0,
  bio             text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT display_name_maxlen CHECK (display_name IS NULL OR char_length(display_name) <= 80)
);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> followed_id)
);

-- Badges (server-managed)
CREATE TABLE IF NOT EXISTS public.badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- User → Badge (awards; server-managed)
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id    uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_by  uuid REFERENCES public.profiles(id),
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- Animals (server-managed)
CREATE TABLE IF NOT EXISTS public.animals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species       text NOT NULL,                                -- scientific name
  common_names  text[] NOT NULL DEFAULT ARRAY[]::text[],
  kingdom       text,
  class         text,
  fun_facts     text,                                         -- newline-separated bullets
  rarity_level  int CHECK (rarity_level BETWEEN 1 AND 10),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species)
);

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  animal_id  uuid REFERENCES public.animals(id) ON DELETE SET NULL,
  image_url  text NOT NULL,
  location   text,
  quality    int NOT NULL CHECK (quality BETWEEN 1 AND 10),
  caption    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES public.profiles(id),
  type         public.notification_type NOT NULL,
  post_id      uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id   uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  badge_id     uuid REFERENCES public.badges(id) ON DELETE CASCADE,
  is_read      boolean NOT NULL DEFAULT false,
  meta         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ========================================
-- INDEXES
-- ========================================

-- Case-insensitive uniqueness for usernames
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username_ci ON public.profiles(username_ci);

-- Trigram indexes for people search
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (COALESCE(display_name,'') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm     ON public.profiles USING gin (username gin_trgm_ops);

-- Feed performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id       ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_animal_id     ON public.posts(animal_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at    ON public.posts(created_at);

-- Follows
CREATE INDEX IF NOT EXISTS idx_follows_follower    ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed    ON public.follows(followed_id);

-- Likes
CREATE INDEX IF NOT EXISTS idx_likes_user          ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post          ON public.likes(post_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_post       ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user       ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);

-- ========================================
-- RLS
-- ========================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles: public select"
  ON public.profiles FOR SELECT TO public USING (true);

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: delete own"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- FOLLOWS
CREATE POLICY "follows: public select"
  ON public.follows FOR SELECT TO public USING (true);

CREATE POLICY "follows: insert by follower"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id AND follower_id <> followed_id);

CREATE POLICY "follows: delete by follower"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- POSTS
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

-- LIKES
CREATE POLICY "likes: public select"
  ON public.likes FOR SELECT TO public USING (true);

CREATE POLICY "likes: insert by user"
  ON public.likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes: delete by user"
  ON public.likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- COMMENTS
CREATE POLICY "comments: public select"
  ON public.comments FOR SELECT TO public USING (true);

CREATE POLICY "comments: insert own"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments: update own"
  ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments: delete own"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "notifications: select own"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "notifications: update own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- READ-ONLY (client) ACCESS FOR REFERENCE TABLES
CREATE POLICY "animals: public select"
  ON public.animals FOR SELECT TO public USING (true);

CREATE POLICY "badges: public select"
  ON public.badges FOR SELECT TO public USING (true);

CREATE POLICY "user_badges: public select"
  ON public.user_badges FOR SELECT TO public USING (true);

-- ========================================
-- STORAGE POLICIES (storage.objects)
-- Assumes object keys:
--   profiles/{user_uuid}/{filename}
--   posts/{user_uuid}/{filename}
-- ========================================

CREATE POLICY "storage: public select posts"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'posts');

CREATE POLICY "storage: insert posts by owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'posts'
              AND split_part(name, '/', 2) = auth.uid()::text);

CREATE POLICY "storage: update posts by owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'posts'
         AND split_part(name, '/', 2) = auth.uid()::text);

CREATE POLICY "storage: public select profiles"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'profiles');

CREATE POLICY "storage: insert profiles by owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles'
              AND split_part(name, '/', 2) = auth.uid()::text);

CREATE POLICY "storage: update profiles by owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profiles'
         AND split_part(name, '/', 2) = auth.uid()::text);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Recompute points = SUM(user's posts rarity_or_quality) + likes received
CREATE OR REPLACE FUNCTION public.recompute_points_for_user(p_user uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  posts_score int := 0;
  likes_count int := 0;
BEGIN
  -- Sum rarity_level if animal present; otherwise fall back to post quality
  SELECT COALESCE(SUM(COALESCE(a.rarity_level, p.quality)), 0)
    INTO posts_score
  FROM public.posts p
  LEFT JOIN public.animals a ON a.id = p.animal_id
  WHERE p.user_id = p_user;

  -- Count likes on user's posts
  SELECT COALESCE(COUNT(*), 0)
    INTO likes_count
  FROM public.likes l
  JOIN public.posts p ON p.id = l.post_id
  WHERE p.user_id = p_user;

  UPDATE public.profiles
     SET points = posts_score + likes_count
   WHERE id = p_user;
END;
$$;

-- Convenience search for people (display_name/username, similarity-ordered)
CREATE OR REPLACE FUNCTION public.search_profiles(q text, limit_n int DEFAULT 20)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.display_name ILIKE '%' || q || '%'
     OR p.username     ILIKE '%' || q || '%'
  ORDER BY GREATEST(similarity(COALESCE(p.display_name,''), q),
                    similarity(p.username, q)) DESC,
           p.created_at DESC
  LIMIT limit_n
$$;

-- ========================================
-- SEED / BACKFILL (safe no-op if already set)
-- ========================================
UPDATE public.profiles
SET display_name = COALESCE(display_name, username)
WHERE display_name IS NULL;


create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, new.email, 'New User'); -- You can set a default display name here
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant USAGE on the 'public' schema to the service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant ALL privileges (SELECT, INSERT, UPDATE, DELETE) on all tables
-- in the 'public' schema to the service_role.
-- This is a broad grant and is safe for the service_role key
-- since that key is only used in trusted server environments like Edge Functions.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant ALL privileges on all sequences in the 'public' schema.
-- This is necessary for tables with `id serial` or other auto-incrementing fields.
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Re-apply default privileges for future tables, just in case
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


DROP POLICY "profiles: update own" ON public.profiles;
-- Fix the trigger function to properly handle username and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, email)
  VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 8), -- Generate unique username
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.posts TO authenticated;
GRANT ALL ON public.likes TO authenticated;
GRANT ALL ON public.comments TO authenticated;
GRANT ALL ON public.animals TO authenticated;
GRANT ALL ON public.follows TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.badges TO authenticated;
GRANT ALL ON public.user_badges TO authenticated;

-- Grant necessary permissions to anon users for public read access
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.likes TO anon;
GRANT SELECT ON public.comments TO anon;
GRANT SELECT ON public.animals TO anon;
GRANT SELECT ON public.follows TO anon;
GRANT SELECT ON public.badges TO anon;
GRANT SELECT ON public.user_badges TO anon;

-- Make sure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify your existing policies are correct
-- These should already exist, but let's make sure:
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
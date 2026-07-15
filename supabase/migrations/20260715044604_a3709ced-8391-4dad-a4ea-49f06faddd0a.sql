
-- ============================================================
-- Fix 1: Restrict profiles SELECT to authenticated users only
-- Fixes: public_contact_info, profiles_table_email_phone_exposure
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- Fix 2: Restrict post_favorites SELECT to owner only
-- Fixes: post_favorites_behavioral_tracking
-- ============================================================
DROP POLICY IF EXISTS "Favorites are viewable by everyone" ON public.post_favorites;

CREATE POLICY "Users can view their own favorites"
ON public.post_favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public counts function so feeds can still display favorites_count
-- without exposing who favorited what.
CREATE OR REPLACE FUNCTION public.get_post_favorites_stats(post_ids uuid[])
RETURNS TABLE(post_id uuid, favorites_count bigint, user_has_favorited boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pf.post_id,
    COUNT(*)::bigint AS favorites_count,
    BOOL_OR(pf.user_id = auth.uid()) AS user_has_favorited
  FROM public.post_favorites pf
  WHERE pf.post_id = ANY(post_ids)
  GROUP BY pf.post_id
$$;

GRANT EXECUTE ON FUNCTION public.get_post_favorites_stats(uuid[]) TO anon, authenticated;

-- ============================================================
-- Fix 3: Restrict conversation_participants INSERT to self only
-- Fixes: conversation_participant_bypass, conversation_participants_unauthorized_enumeration
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;

CREATE POLICY "Users can add themselves as participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- SECURITY DEFINER function to atomically create a 1:1 conversation
-- between the current authenticated user and a target user.
-- This is the only supported way to add another user, and it enforces
-- that the caller is authenticated and only initiates conversations
-- with themselves as one of the participants.
CREATE OR REPLACE FUNCTION public.create_conversation_with_user(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  new_conversation_id uuid;
  existing_conversation_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF target_user_id IS NULL OR target_user_id = current_user_id THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;

  -- Ensure the target user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user does not exist';
  END IF;

  -- Return existing 1:1 conversation if one already exists
  SELECT cp1.conversation_id INTO existing_conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = target_user_id
  LIMIT 1;

  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO new_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (new_conversation_id, current_user_id),
    (new_conversation_id, target_user_id);

  RETURN new_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_conversation_with_user(uuid) TO authenticated;

-- ============================================================
-- Fix 4: Enforce safe external_url protocols on posts (defense in depth)
-- Fixes: no_url_validation
-- ============================================================
ALTER TABLE public.posts
  ADD CONSTRAINT posts_external_url_safe_protocol
  CHECK (
    external_url IS NULL
    OR external_url ~* '^https?://[^\s]+$'
  );

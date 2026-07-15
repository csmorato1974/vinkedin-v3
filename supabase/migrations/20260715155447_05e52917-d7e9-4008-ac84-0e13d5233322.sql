
-- 1) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon, keep authenticated only where app uses them
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_post_favorites_stats(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_conversation_with_user(uuid) FROM PUBLIC, anon;

-- Ensure authenticated can still use the ones invoked by RLS/RPC from the app
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_favorites_stats(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_with_user(uuid) TO authenticated;

-- 2) Prevent broad listing of public storage buckets. Public URL delivery does not require a SELECT policy.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Content media is publicly accessible" ON storage.objects;

-- Restrict SELECT (list/metadata) on storage.objects to the file owner only, per bucket.
CREATE POLICY "Users can read their own avatar objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own content objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'content-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

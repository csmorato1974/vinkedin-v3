import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Post, Profile } from '@/types';

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch posts with author profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      if (!postsData) {
        setPosts([]);
        return;
      }

      // Fetch likes count and user's likes
      const postIds = postsData.map((p) => p.id);
      
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);

      // Build posts with counts
      const enrichedPosts: Post[] = postsData.map((post) => {
        const postLikes = likesData?.filter((l) => l.post_id === post.id) || [];
        const postComments = commentsData?.filter((c) => c.post_id === post.id) || [];

        return {
          id: post.id,
          author_id: post.author_id,
          author: post.author as Profile,
          type: post.type as 'original' | 'repost',
          text: post.text,
          external_url: post.external_url,
          media_urls: post.media_urls || [],
          repost_of_id: post.repost_of_id,
          likes_count: postLikes.length,
          comments_count: postComments.length,
          user_has_liked: user ? postLikes.some((l) => l.user_id === user.id) : false,
          created_at: post.created_at,
          updated_at: post.updated_at,
        };
      });

      setPosts(enrichedPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar posts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleLike = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              user_has_liked: !p.user_has_liked,
              likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );

    try {
      if (post.user_has_liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        await supabase.from('post_likes').insert({
          user_id: user.id,
          post_id: postId,
        });
      }
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_liked: post.user_has_liked,
                likes_count: post.likes_count,
              }
            : p
        )
      );
    }
  };

  const updatePost = async (
    postId: string,
    updates: { text?: string | null; external_url?: string | null; media_urls?: string[] }
  ) => {
    if (!user) return false;

    const post = posts.find((p) => p.id === postId);
    if (!post || post.author_id !== user.id) return false;

    const { error } = await supabase
      .from('posts')
      .update({
        text: updates.text,
        external_url: updates.external_url,
        media_urls: updates.media_urls,
      })
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      console.error('Error updating post:', error);
      return false;
    }

    // Update local state
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              text: updates.text ?? p.text,
              external_url: updates.external_url ?? p.external_url,
              media_urls: updates.media_urls ?? p.media_urls,
            }
          : p
      )
    );

    return true;
  };

  const deletePost = async (postId: string) => {
    if (!user) return false;

    const post = posts.find((p) => p.id === postId);
    if (!post || post.author_id !== user.id) return false;

    // Delete media from storage
    if (post.media_urls && post.media_urls.length > 0) {
      const filePaths = post.media_urls.map((url) => {
        const parts = url.split('/content-media/');
        return parts.length > 1 ? parts[1] : null;
      }).filter(Boolean) as string[];

      if (filePaths.length > 0) {
        await supabase.storage.from('content-media').remove(filePaths);
      }
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      console.error('Error deleting post:', error);
      return false;
    }

    // Update local state
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    return true;
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
    toggleLike,
    updatePost,
    deletePost,
  };
}

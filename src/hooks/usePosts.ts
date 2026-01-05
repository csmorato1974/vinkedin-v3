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

      // Fetch likes, comments, favorites, and reposts count
      const postIds = postsData.map((p) => p.id);
      
      const [{ data: likesData }, { data: commentsData }, { data: favoritesData }, { data: repostsData }] = await Promise.all([
        supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        supabase.from('post_favorites').select('post_id, user_id').in('post_id', postIds),
        supabase.from('posts').select('repost_of_id, author_id').in('repost_of_id', postIds),
      ]);

      // Build posts with counts
      const enrichedPosts: Post[] = postsData.map((post) => {
        const postLikes = likesData?.filter((l) => l.post_id === post.id) || [];
        const postComments = commentsData?.filter((c) => c.post_id === post.id) || [];
        const postFavorites = favoritesData?.filter((f) => f.post_id === post.id) || [];
        const postReposts = repostsData?.filter((r) => r.repost_of_id === post.id) || [];

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
          favorites_count: postFavorites.length,
          user_has_favorited: user ? postFavorites.some((f) => f.user_id === user.id) : false,
          reposts_count: postReposts.length,
          user_has_reposted: user ? postReposts.some((r) => r.author_id === user.id) : false,
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

  const toggleFavorite = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              user_has_favorited: !p.user_has_favorited,
              favorites_count: p.user_has_favorited ? p.favorites_count - 1 : p.favorites_count + 1,
            }
          : p
      )
    );

    try {
      if (post.user_has_favorited) {
        await supabase
          .from('post_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
      } else {
        await supabase.from('post_favorites').insert({
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
                user_has_favorited: post.user_has_favorited,
                favorites_count: post.favorites_count,
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

  const toggleRepost = async (postId: string) => {
    if (!user) return { success: false, needsAuth: true };

    const post = posts.find((p) => p.id === postId);
    if (!post) return { success: false, needsAuth: false };

    // Check if user already reposted this post
    const { data: existingRepost } = await supabase
      .from('posts')
      .select('id')
      .eq('repost_of_id', postId)
      .eq('author_id', user.id)
      .maybeSingle();

    if (existingRepost) {
      // Undo repost - delete the repost
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', existingRepost.id)
        .eq('author_id', user.id);

      if (error) {
        console.error('Error undoing repost:', error);
        return { success: false, needsAuth: false };
      }

      // Update local state
      setPosts((prev) =>
        prev
          .filter((p) => p.id !== existingRepost.id)
          .map((p) =>
            p.id === postId
              ? { ...p, reposts_count: p.reposts_count - 1, user_has_reposted: false }
              : p
          )
      );

      return { success: true, needsAuth: false, action: 'undone' };
    } else {
      // Create repost
      const { data: newRepost, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          type: 'repost' as const,
          repost_of_id: postId,
          text: null,
          external_url: null,
          media_urls: [],
        })
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*)
        `)
        .single();

      if (error) {
        console.error('Error creating repost:', error);
        return { success: false, needsAuth: false };
      }

      // Update local state - add repost and update original post count
      const enrichedRepost: Post = {
        id: newRepost.id,
        author_id: newRepost.author_id,
        author: newRepost.author as Profile,
        type: 'repost',
        text: newRepost.text,
        external_url: newRepost.external_url,
        media_urls: newRepost.media_urls || [],
        repost_of_id: newRepost.repost_of_id,
        repost_of: post,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false,
        favorites_count: 0,
        user_has_favorited: false,
        reposts_count: 0,
        user_has_reposted: false,
        created_at: newRepost.created_at,
        updated_at: newRepost.updated_at,
      };

      setPosts((prev) => [
        enrichedRepost,
        ...prev.map((p) =>
          p.id === postId
            ? { ...p, reposts_count: p.reposts_count + 1, user_has_reposted: true }
            : p
        ),
      ]);

      return { success: true, needsAuth: false, action: 'created' };
    }
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
    toggleFavorite,
    updatePost,
    deletePost,
    toggleRepost,
  };
}

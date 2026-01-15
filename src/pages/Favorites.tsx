import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Star, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Post, Profile } from '@/types';

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user's favorite post IDs
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('post_favorites')
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = favoritesData.map((f) => f.post_id);

      // Fetch posts with author profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*)
        `)
        .in('id', postIds);

      if (postsError) throw postsError;

      if (!postsData) {
        setPosts([]);
        return;
      }

      // Fetch likes, comments, favorites, and reposts count
      const [{ data: likesData }, { data: commentsData }, { data: allFavoritesData }, { data: repostsData }] = await Promise.all([
        supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        supabase.from('post_favorites').select('post_id, user_id').in('post_id', postIds),
        supabase.from('posts').select('repost_of_id, author_id').in('repost_of_id', postIds),
      ]);

      // Build posts with counts, maintaining order from favorites
      const enrichedPosts: Post[] = postIds
        .map((postId) => {
          const post = postsData.find((p) => p.id === postId);
          if (!post) return null;

          const postLikes = likesData?.filter((l) => l.post_id === post.id) || [];
          const postComments = commentsData?.filter((c) => c.post_id === post.id) || [];
          const postFavorites = allFavoritesData?.filter((f) => f.post_id === post.id) || [];
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
            user_has_liked: postLikes.some((l) => l.user_id === user.id),
            favorites_count: postFavorites.length,
            user_has_favorited: true, // All posts here are favorited by the user
            reposts_count: postReposts.length,
            user_has_reposted: postReposts.some((r) => r.author_id === user.id),
            created_at: post.created_at,
            updated_at: post.updated_at,
          };
        })
        .filter((p): p is Post => p !== null);

      setPosts(enrichedPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

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

    // When removing from favorites, we'll remove it from the list
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await supabase
        .from('post_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);
    } catch {
      // Re-add on error
      fetchFavorites();
    }
  };

  const toggleRepost = async (postId: string) => {
    if (!user) return { success: false, needsAuth: true };

    const post = posts.find((p) => p.id === postId);
    if (!post) return { success: false, needsAuth: false };

    // Always repost the ORIGINAL post, never a repost wrapper
    const targetOriginalId = post.type === 'repost' && post.repost_of_id 
      ? post.repost_of_id 
      : post.id;

    // Check if user already reposted the original post
    const { data: existingRepost } = await supabase
      .from('posts')
      .select('id')
      .eq('repost_of_id', targetOriginalId)
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

      // Update local state - update the original post's counter
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === targetOriginalId) {
            return { ...p, reposts_count: p.reposts_count - 1, user_has_reposted: false };
          }
          if (p.type === 'repost' && p.repost_of_id === targetOriginalId && p.repost_of) {
            return {
              ...p,
              repost_of: { ...p.repost_of, reposts_count: p.repost_of.reposts_count - 1, user_has_reposted: false }
            };
          }
          return p;
        })
      );

      return { success: true, needsAuth: false, action: 'undone' };
    } else {
      // Create repost of the original
      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          type: 'repost' as const,
          repost_of_id: targetOriginalId,
          text: null,
          external_url: null,
          media_urls: [],
        });

      if (error) {
        console.error('Error creating repost:', error);
        return { success: false, needsAuth: false };
      }

      // Update local state - update the original post's counter
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === targetOriginalId) {
            return { ...p, reposts_count: p.reposts_count + 1, user_has_reposted: true };
          }
          if (p.type === 'repost' && p.repost_of_id === targetOriginalId && p.repost_of) {
            return {
              ...p,
              repost_of: { ...p.repost_of, reposts_count: p.repost_of.reposts_count + 1, user_has_reposted: true }
            };
          }
          return p;
        })
      );

      return { success: true, needsAuth: false, action: 'created' };
    }
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

  return (
    <MainLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl font-bold">Mis Favoritos</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="w-full md:mx-auto md:max-w-2xl md:px-4 md:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchFavorites} variant="outline" className="mt-4">
              Reintentar
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-20 text-center"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
              <Star className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold">No tienes favoritos aún</h2>
            <p className="mt-2 text-muted-foreground">
              Marca publicaciones como favoritas para verlas aquí
            </p>
            <Button
              onClick={() => navigate('/')}
              className="mt-4 bg-gradient-brand text-white"
            >
              Explorar publicaciones
            </Button>
          </motion.div>
        ) : (
          <div className="divide-y divide-border md:divide-y-0 md:space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={toggleLike}
                onFavorite={toggleFavorite}
                onRepost={toggleRepost}
                onDelete={deletePost}
                onUpdate={fetchFavorites}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

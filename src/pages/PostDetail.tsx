import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Share2, ExternalLink, ArrowLeft, Loader2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImageCarousel } from '@/components/posts/ImageCarousel';
import type { Post, Profile } from '@/types';

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false);
  const [isRepostAnimating, setIsRepostAnimating] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost(postId);
    }
  }, [postId, user]);

  const fetchPost = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (postError) throw postError;

      if (!postData) {
        setError('Post no encontrado');
        setLoading(false);
        return;
      }

      // Fetch likes, comments, favorites, and reposts count
      const [{ data: likesData }, { data: commentsData }, { data: favoritesData }, { data: repostsData }] = await Promise.all([
        supabase.from('post_likes').select('user_id').eq('post_id', id),
        supabase.from('comments').select('id').eq('post_id', id),
        supabase.from('post_favorites').select('user_id').eq('post_id', id),
        supabase.from('posts').select('author_id').eq('repost_of_id', id),
      ]);

      const enrichedPost: Post = {
        id: postData.id,
        author_id: postData.author_id,
        author: postData.author as Profile,
        type: postData.type as 'original' | 'repost',
        text: postData.text,
        external_url: postData.external_url,
        media_urls: postData.media_urls || [],
        repost_of_id: postData.repost_of_id,
        likes_count: likesData?.length || 0,
        comments_count: commentsData?.length || 0,
        user_has_liked: user ? likesData?.some((l) => l.user_id === user.id) || false : false,
        favorites_count: favoritesData?.length || 0,
        user_has_favorited: user ? favoritesData?.some((f) => f.user_id === user.id) || false : false,
        reposts_count: repostsData?.length || 0,
        user_has_reposted: user ? repostsData?.some((r) => r.author_id === user.id) || false : false,
        created_at: postData.created_at,
        updated_at: postData.updated_at,
      };

      setPost(enrichedPost);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!post) return;

    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 300);

    // Optimistic update
    setPost((prev) =>
      prev
        ? {
            ...prev,
            user_has_liked: !prev.user_has_liked,
            likes_count: prev.user_has_liked ? prev.likes_count - 1 : prev.likes_count + 1,
          }
        : null
    );

    try {
      if (post.user_has_liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
      } else {
        await supabase.from('post_likes').insert({
          user_id: user.id,
          post_id: post.id,
        });
      }
    } catch {
      // Revert on error
      setPost((prev) =>
        prev
          ? {
              ...prev,
              user_has_liked: post.user_has_liked,
              likes_count: post.likes_count,
            }
          : null
      );
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!post) return;

    setIsFavoriteAnimating(true);
    setTimeout(() => setIsFavoriteAnimating(false), 300);

    // Optimistic update
    setPost((prev) =>
      prev
        ? {
            ...prev,
            user_has_favorited: !prev.user_has_favorited,
            favorites_count: prev.user_has_favorited ? prev.favorites_count - 1 : prev.favorites_count + 1,
          }
        : null
    );

    try {
      if (post.user_has_favorited) {
        await supabase
          .from('post_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
      } else {
        await supabase.from('post_favorites').insert({
          user_id: user.id,
          post_id: post.id,
        });
      }
    } catch {
      // Revert on error
      setPost((prev) =>
        prev
          ? {
              ...prev,
              user_has_favorited: post.user_has_favorited,
              favorites_count: post.favorites_count,
            }
          : null
      );
    }
  };

  const handleRepost = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!post) return;

    setIsRepostAnimating(true);
    setTimeout(() => setIsRepostAnimating(false), 300);

    // Check if user already reposted this post
    const { data: existingRepost } = await supabase
      .from('posts')
      .select('id')
      .eq('repost_of_id', post.id)
      .eq('author_id', user.id)
      .maybeSingle();

    if (existingRepost) {
      // Undo repost
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', existingRepost.id)
        .eq('author_id', user.id);

      if (!error) {
        setPost((prev) =>
          prev
            ? { ...prev, reposts_count: prev.reposts_count - 1, user_has_reposted: false }
            : null
        );
        toast.success('Repost eliminado');
      }
    } else {
      // Create repost
      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          type: 'repost' as const,
          repost_of_id: post.id,
          text: null,
          external_url: null,
          media_urls: [],
        });

      if (!error) {
        setPost((prev) =>
          prev
            ? { ...prev, reposts_count: prev.reposts_count + 1, user_has_reposted: true }
            : null
        );
        toast.success('Publicación reposteada');
      }
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles');
  };

  const handleComment = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Future: Open comments modal or navigate to comments section
    toast.info('Próximamente: sección de comentarios');
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-lg text-muted-foreground">{error || 'Post no encontrado'}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio
        </Button>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-2xl items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Publicación</h1>
        </div>
      </header>

      {/* Post content */}
      <main className="mx-auto max-w-2xl p-4">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          {/* Repost indicator */}
          {post.type === 'repost' && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Repeat2 className="h-4 w-4" />
              <span>{post.author.name} reposteó</span>
            </div>
          )}

          {/* Author header */}
          <div className="flex items-start gap-3">
            <Link
              to={user ? `/profile/${post.author_id}` : '/auth'}
              className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand"
            >
              {post.author.avatar_url ? (
                <img
                  src={post.author.avatar_url}
                  alt={post.author.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                  {post.author.name.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                to={user ? `/profile/${post.author_id}` : '/auth'}
                className="font-semibold text-foreground hover:underline"
              >
                {post.author.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {post.author.role && <span>{post.author.role}</span>}
                {post.author.role && post.author.company && <span>•</span>}
                {post.author.company && <span>{post.author.company}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
            </div>
          </div>

          {/* Post text */}
          {post.text && (
            <p className="mt-4 whitespace-pre-wrap text-lg text-foreground">{post.text}</p>
          )}

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mt-4 rounded-xl overflow-hidden">
              <ImageCarousel images={post.media_urls} />
            </div>
          )}

          {/* External link */}
          {post.external_url && (
            <a
              href={post.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-primary truncate">
                {extractDomain(post.external_url)}
              </span>
            </a>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                'gap-2 text-muted-foreground hover:text-destructive',
                post.user_has_liked && 'text-destructive'
              )}
            >
              <Heart
                className={cn(
                  'h-5 w-5 transition-transform',
                  post.user_has_liked && 'fill-current',
                  isLikeAnimating && 'scale-125'
                )}
              />
              <span>{post.likes_count || ''}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-5 w-5" />
              <span>{post.comments_count || ''}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavorite}
              className={cn(
                'gap-2 text-muted-foreground hover:text-amber-500',
                post.user_has_favorited && 'text-amber-500'
              )}
            >
              <Star
                className={cn(
                  'h-5 w-5 transition-transform',
                  post.user_has_favorited && 'fill-current',
                  isFavoriteAnimating && 'scale-125'
                )}
              />
              <span>{post.favorites_count || ''}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRepost}
              className={cn(
                'gap-2 text-muted-foreground hover:text-brand-green',
                post.user_has_reposted && 'text-brand-green'
              )}
            >
              <Repeat2
                className={cn(
                  'h-5 w-5 transition-transform',
                  isRepostAnimating && 'scale-125'
                )}
              />
              <span>{post.reposts_count || ''}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Login prompt for non-authenticated users */}
          {!user && (
            <div className="mt-4 rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Inicia sesión para interactuar con esta publicación
              </p>
              <Button onClick={() => navigate('/auth')} className="bg-gradient-brand text-white">
                Iniciar sesión
              </Button>
            </div>
          )}
        </motion.article>
      </main>
    </div>
  );
}

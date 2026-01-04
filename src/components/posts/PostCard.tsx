import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Share2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Post } from '@/types';
import { ImageCarousel } from './ImageCarousel';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment?: (postId: string) => void;
  onRepost?: (postId: string) => void;
}

export function PostCard({ post, onLike, onComment, onRepost }: PostCardProps) {
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const handleLike = () => {
    setIsLikeAnimating(true);
    onLike(post.id);
    setTimeout(() => setIsLikeAnimating(false), 300);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles');
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full border-b border-border bg-card p-4 md:mb-4 md:rounded-xl md:border md:shadow-sm"
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
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand">
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={post.author.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">
              {post.author.name}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {post.author.role && <span className="truncate">{post.author.role}</span>}
            {post.author.role && post.author.company && <span>•</span>}
            {post.author.company && <span className="truncate">{post.author.company}</span>}
          </div>
        </div>
      </div>

      {/* Post content */}
      {post.text && (
        <p className="mt-3 whitespace-pre-wrap text-foreground">{post.text}</p>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mt-3 -mx-4 md:mx-0 md:rounded-xl md:overflow-hidden">
          <ImageCarousel images={post.media_urls} />
        </div>
      )}

      {/* External link */}
      {post.external_url && (
        <a
          href={post.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-primary truncate">
            {extractDomain(post.external_url)}
          </span>
        </a>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
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
              isLikeAnimating && 'animate-like-pop'
            )}
          />
          <span>{post.likes_count || ''}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComment?.(post.id)}
          className="gap-2 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.comments_count || ''}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRepost?.(post.id)}
          className="gap-2 text-muted-foreground hover:text-brand-green"
        >
          <Repeat2 className="h-5 w-5" />
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
    </motion.article>
  );
}

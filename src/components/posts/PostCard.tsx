import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Repeat2, Share2, ExternalLink, MoreHorizontal, Pencil, Trash2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import type { Post } from '@/types';
import { ImageCarousel } from './ImageCarousel';
import { EditPostModal } from './EditPostModal';
import { CommentsSection } from './CommentsSection';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onFavorite?: (postId: string) => void;
  onRepost?: (postId: string) => Promise<{ success: boolean; needsAuth: boolean; action?: string }>;
  onDelete?: (postId: string) => Promise<boolean>;
  onUpdate?: () => void;
}

export function PostCard({ post, onLike, onFavorite, onRepost, onDelete, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false);
  const [isRepostAnimating, setIsRepostAnimating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showComments, setShowComments] = useState(false);

  // Determine which content to display and which post ID to use for actions
  const displayPost = post.type === 'repost' && post.repost_of ? post.repost_of : post;
  const actionPostId = displayPost.id;
  
  const [commentsCount, setCommentsCount] = useState(displayPost.comments_count);

  const isAuthor = user?.id === post.author_id;

  const handleLike = () => {
    setIsLikeAnimating(true);
    onLike(actionPostId);
    setTimeout(() => setIsLikeAnimating(false), 300);
  };

  const handleFavorite = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsFavoriteAnimating(true);
    onFavorite?.(actionPostId);
    setTimeout(() => setIsFavoriteAnimating(false), 300);
  };

  const handleRepost = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsRepostAnimating(true);
    const result = await onRepost?.(actionPostId);
    setTimeout(() => setIsRepostAnimating(false), 300);
    
    if (result?.success) {
      if (result.action === 'created') {
        toast.success('Publicación reposteada');
      } else if (result.action === 'undone') {
        toast.success('Repost eliminado');
      }
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${actionPostId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles');
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    const success = await onDelete(post.id);
    if (success) {
      toast.success('Publicación eliminada');
    } else {
      toast.error('Error al eliminar la publicación');
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };


  const handleEditSuccess = () => {
    onUpdate?.();
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Defense-in-depth: only render external links with safe protocols
  const isSafeUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full border-b border-border bg-card p-4 md:mb-4 md:rounded-xl md:border md:shadow-sm"
      >
        {/* Repost indicator */}
        {post.type === 'repost' && (
          <div 
            className="mb-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:underline"
            onClick={() => navigate(`/profile/${post.author_id}`)}
          >
            <Repeat2 className="h-4 w-4" />
            <span>{post.author.name} reposteó</span>
          </div>
        )}

        {/* Author header - show original author for reposts */}
        <div className="flex items-start gap-3">
          <div 
            className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand cursor-pointer"
            onClick={() => navigate(`/profile/${displayPost.author_id}`)}
          >
            {displayPost.author.avatar_url ? (
              <img
                src={displayPost.author.avatar_url}
                alt={displayPost.author.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                {displayPost.author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span 
                className="font-semibold text-foreground truncate cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${displayPost.author_id}`)}
              >
                {displayPost.author.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(displayPost.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {displayPost.author.role && <span className="truncate">{displayPost.author.role}</span>}
              {displayPost.author.role && displayPost.author.company && <span>•</span>}
              {displayPost.author.company && <span className="truncate">{displayPost.author.company}</span>}
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post content - show original content for reposts */}
        {displayPost.text && (
          <p className="mt-3 whitespace-pre-wrap text-foreground">{displayPost.text}</p>
        )}

        {/* Media */}
        {displayPost.media_urls && displayPost.media_urls.length > 0 && (
          <div className="mt-3 -mx-4 md:mx-0 md:rounded-xl md:overflow-hidden">
            <ImageCarousel images={displayPost.media_urls} />
          </div>
        )}

        {/* External link */}
        {displayPost.external_url && isSafeUrl(displayPost.external_url) && (
          <a
            href={displayPost.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-primary truncate">
              {extractDomain(displayPost.external_url)}
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
              displayPost.user_has_liked && 'text-destructive'
            )}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-transform',
                displayPost.user_has_liked && 'fill-current',
                isLikeAnimating && 'animate-like-pop'
              )}
            />
            <span>{displayPost.likes_count || ''}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className={cn(
              'gap-2 text-muted-foreground hover:text-primary',
              showComments && 'text-primary'
            )}
          >
            <MessageCircle className={cn('h-5 w-5', showComments && 'fill-current')} />
            <span>{commentsCount || ''}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            className={cn(
              'gap-2 text-muted-foreground hover:text-amber-500',
              displayPost.user_has_favorited && 'text-amber-500'
            )}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-transform',
                displayPost.user_has_favorited && 'fill-current',
                isFavoriteAnimating && 'animate-like-pop'
              )}
            />
            <span>{displayPost.favorites_count || ''}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRepost}
            className={cn(
              'gap-2 text-muted-foreground hover:text-brand-green',
              displayPost.user_has_reposted && 'text-brand-green'
            )}
          >
            <Repeat2
              className={cn(
                'h-5 w-5 transition-transform',
                isRepostAnimating && 'animate-like-pop'
              )}
            />
            <span>{displayPost.reposts_count || ''}</span>
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

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CommentsSection 
                postId={actionPostId} 
                onCommentCountChange={setCommentsCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {/* Edit Modal */}
      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        post={post}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar este post? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

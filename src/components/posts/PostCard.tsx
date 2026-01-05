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
  onRepost?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<boolean>;
  onUpdate?: () => void;
}

export function PostCard({ post, onLike, onFavorite, onRepost, onDelete, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isFavoriteAnimating, setIsFavoriteAnimating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);

  const isAuthor = user?.id === post.author_id;

  const handleLike = () => {
    setIsLikeAnimating(true);
    onLike(post.id);
    setTimeout(() => setIsLikeAnimating(false), 300);
  };

  const handleFavorite = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsFavoriteAnimating(true);
    onFavorite?.(post.id);
    setTimeout(() => setIsFavoriteAnimating(false), 300);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
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
    <>
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
          <div 
            className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand cursor-pointer"
            onClick={() => navigate(`/profile/${post.author_id}`)}
          >
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
              <span 
                className="font-semibold text-foreground truncate cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${post.author_id}`)}
              >
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
              post.user_has_favorited && 'text-amber-500'
            )}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-transform',
                post.user_has_favorited && 'fill-current',
                isFavoriteAnimating && 'animate-like-pop'
              )}
            />
            <span>{post.favorites_count || ''}</span>
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
                postId={post.id} 
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

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface CommentsSectionProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

export function CommentsSection({ postId, onCommentCountChange }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          user_id,
          created_at,
          author:profiles!comments_user_id_fkey(id, name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = (data || []).map(comment => ({
        id: comment.id,
        text: comment.text,
        user_id: comment.user_id,
        created_at: comment.created_at,
        author: comment.author as { id: string; name: string; avatar_url: string | null },
      }));

      setComments(formattedComments);
      onCommentCountChange?.(formattedComments.length);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          text: newComment.trim(),
        })
        .select(`
          id,
          text,
          user_id,
          created_at,
          author:profiles!comments_user_id_fkey(id, name, avatar_url)
        `)
        .single();

      if (error) throw error;

      const newCommentData: Comment = {
        id: data.id,
        text: data.text,
        user_id: data.user_id,
        created_at: data.created_at,
        author: data.author as { id: string; name: string; avatar_url: string | null },
      };

      setComments(prev => [newCommentData, ...prev]);
      setNewComment('');
      onCommentCountChange?.(comments.length + 1);
      toast.success('Comentario publicado');
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error('Error al publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;

    setDeletingId(commentId);
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentCountChange?.(comments.length - 1);
      toast.success('Comentario eliminado');
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Error al eliminar el comentario');
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 mt-2">
      {/* New comment input */}
      {user ? (
        <div className="flex gap-3 mb-4">
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Tu avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                {(user.user_metadata?.name || user.email)?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un comentario..."
              className="min-h-[40px] resize-none"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="shrink-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          Inicia sesión para comentar
        </p>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No hay comentarios aún. ¡Sé el primero!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand">
                {comment.author.avatar_url ? (
                  <img
                    src={comment.author.avatar_url}
                    alt={comment.author.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-0.5 break-words">
                  {comment.text}
                </p>
              </div>
              {user?.id === comment.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

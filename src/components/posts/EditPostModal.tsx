import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Link2, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post: Post;
}

const MAX_CHARS = 500;
const MAX_IMAGES = 10;

export function EditPostModal({ isOpen, onClose, onSuccess, post }: EditPostModalProps) {
  const { user, profile } = useAuth();
  const [text, setText] = useState(post.text || '');
  const [externalUrl, setExternalUrl] = useState(post.external_url || '');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>(post.media_urls || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(!!post.external_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(post.text || '');
      setExternalUrl(post.external_url || '');
      setExistingMediaUrls(post.media_urls || []);
      setNewImages([]);
      setNewImagePreviews([]);
      setShowUrlInput(!!post.external_url);
    }
  }, [isOpen, post]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setText(e.target.value);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingMediaUrls.length + newImages.length;
    const remainingSlots = MAX_IMAGES - totalImages;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`Solo puedes subir ${MAX_IMAGES} imágenes máximo`);
    }

    setNewImages((prev) => [...prev, ...filesToAdd]);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!text.trim() && existingMediaUrls.length === 0 && newImages.length === 0) {
      toast.error('Escribe algo o añade una imagen');
      return;
    }

    if (externalUrl && !validateUrl(externalUrl)) {
      toast.error('URL no válida');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload new images
      const uploadedUrls: string[] = [];

      for (const image of newImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('content-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      const allMediaUrls = [...existingMediaUrls, ...uploadedUrls];

      // Update post
      const { error: postError } = await supabase
        .from('posts')
        .update({
          text: text.trim() || null,
          external_url: externalUrl.trim() || null,
          media_urls: allMediaUrls,
        })
        .eq('id', post.id)
        .eq('author_id', user.id);

      if (postError) throw postError;

      toast.success('¡Publicación actualizada!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error al actualizar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-semibold">Editar publicación</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {/* Author */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-brand">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                      {profile?.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-medium">{profile?.name}</span>
              </div>

              {/* Text input */}
              <Textarea
                value={text}
                onChange={handleTextChange}
                placeholder="¿Qué quieres compartir?"
                className="min-h-[120px] resize-none border-0 bg-transparent p-0 text-lg focus-visible:ring-0"
              />

              {/* Character counter */}
              <div
                className={cn(
                  'mt-2 text-right text-sm',
                  text.length > MAX_CHARS * 0.9
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {text.length}/{MAX_CHARS}
              </div>

              {/* Existing image previews */}
              {existingMediaUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {existingMediaUrls.map((url, index) => (
                    <div
                      key={url}
                      className="group relative aspect-square overflow-hidden rounded-lg"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removeExistingImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New image previews */}
              {newImagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {newImagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-primary"
                    >
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removeNewImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* URL input */}
              {showUrlInput && (
                <div className="mt-4">
                  <Input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="border-border"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border p-4">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={existingMediaUrls.length + newImages.length >= MAX_IMAGES}
                  className="text-primary"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className={cn(showUrlInput && 'bg-accent', 'text-primary')}
                >
                  <Link2 className="h-5 w-5" />
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (!text.trim() && existingMediaUrls.length === 0 && newImages.length === 0)}
                className="bg-gradient-brand text-white hover:opacity-90"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

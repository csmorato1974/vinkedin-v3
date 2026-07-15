import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Link2, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_CHARS = 500;
const MAX_IMAGES = 10;

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setText(e.target.value);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - images.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.warning(`Solo puedes subir ${MAX_IMAGES} imágenes máximo`);
    }

    const newImages = [...images, ...filesToAdd];
    setImages(newImages);

    // Generate previews
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateUrl = (url: string) => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      // Only allow http/https to block javascript:, data:, file:, vbscript:, etc.
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!text.trim() && images.length === 0) {
      toast.error('Escribe algo o añade una imagen');
      return;
    }

    if (externalUrl && !validateUrl(externalUrl)) {
      toast.error('URL no válida. Solo se permiten enlaces http:// o https://');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images
      const mediaUrls: string[] = [];

      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('content-media')
          .getPublicUrl(fileName);

        mediaUrls.push(urlData.publicUrl);
      }

      // Create post
      const { error: postError } = await supabase.from('posts').insert({
        author_id: user.id,
        text: text.trim() || null,
        external_url: externalUrl.trim() || null,
        media_urls: mediaUrls,
        type: 'original',
      });

      if (postError) throw postError;

      toast.success('¡Publicado!');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error('Error al publicar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setText('');
    setExternalUrl('');
    setImages([]);
    setImagePreviews([]);
    setShowUrlInput(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
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
              <h2 className="text-lg font-semibold">Crear publicación</h2>
              <button
                onClick={handleClose}
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

              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square overflow-hidden rounded-lg"
                    >
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
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
                  disabled={images.length >= MAX_IMAGES}
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
                disabled={isSubmitting || (!text.trim() && images.length === 0)}
                className="bg-gradient-brand text-white hover:opacity-90"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Publicar'
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

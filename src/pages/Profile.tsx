import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Loader2, MessageCircle, Edit2, Save, X, LogOut } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { getOrCreateConversation } from '@/hooks/useConversation';
import { toast } from 'sonner';
import type { Profile as ProfileType } from '@/types';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: authProfile, refreshProfile, signOut } = useAuth();
  const { posts, toggleLike, deletePost, refetch } = usePosts();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    role: '',
    tags: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchProfile(targetUserId);
    }
  }, [targetUserId]);

  const fetchProfile = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setProfile(data as ProfileType);
      setEditForm({
        name: data.name || '',
        company: data.company || '',
        role: data.role || '',
        tags: (data.tags || []).join(', '),
      });
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error('Error al subir la imagen');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    if (!updateError) {
      setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      refreshProfile();
      toast.success('Foto actualizada');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    const tags = editForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: editForm.name,
        company: editForm.company || null,
        role: editForm.role || null,
        tags,
      })
      .eq('id', user.id);

    if (!error) {
      fetchProfile(user.id);
      refreshProfile();
      setIsEditing(false);
      toast.success('Perfil actualizado');
    } else {
      toast.error('Error al guardar');
    }

    setIsSaving(false);
  };

  const userPosts = posts.filter((p) => p.author_id === targetUserId);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Perfil no encontrado</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="md:mx-auto md:max-w-2xl">
        {/* Profile header */}
        <div className="border-b border-border bg-card p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-brand md:h-24 md:w-24">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white md:text-3xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-white shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Nombre"
                  />
                  <Input
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    placeholder="Rol"
                  />
                  <Input
                    value={editForm.company}
                    onChange={(e) =>
                      setEditForm({ ...editForm, company: e.target.value })
                    }
                    placeholder="Empresa"
                  />
                  <Input
                    value={editForm.tags}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tags: e.target.value })
                    }
                    placeholder="Tags (separados por coma)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-gradient-brand text-white"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold md:text-2xl">{profile.name}</h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  {(profile.role || profile.company) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.role}
                      {profile.role && profile.company && ' • '}
                      {profile.company}
                    </p>
                  )}
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {profile.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="mt-4 flex flex-col gap-2">
              {isOwnProfile ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar perfil
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="w-full text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <Button
                  onClick={async () => {
                    if (!user) return;
                    setIsStartingChat(true);
                    const conversationId = await getOrCreateConversation(user.id, profile.id);
                    if (conversationId) {
                      navigate(`/chat?conversation=${conversationId}`);
                    } else {
                      toast.error('Error al iniciar la conversación');
                    }
                    setIsStartingChat(false);
                  }}
                  disabled={isStartingChat}
                  className="w-full bg-gradient-brand text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {isStartingChat ? 'Iniciando...' : 'Enviar mensaje'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* User posts */}
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Publicaciones</h2>
        </div>

        {userPosts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {isOwnProfile
              ? 'Aún no has publicado nada'
              : 'Este usuario no ha publicado nada'}
          </div>
        ) : (
          <div className="divide-y divide-border md:divide-y-0 md:space-y-4 md:p-4">
            {userPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onLike={toggleLike} 
                onDelete={deletePost}
                onUpdate={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

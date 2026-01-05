import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Loader2, Edit2, Save, X, LogOut, Share2, Mail, Phone, Globe, Linkedin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { toast } from 'sonner';
import type { Profile as ProfileType } from '@/types';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: authProfile, refreshProfile, signOut } = useAuth();
  const { posts, toggleLike, deletePost, refetch } = usePosts();

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    role: '',
    tags: '',
    phone: '',
    website: '',
    linkedin: '',
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
        phone: data.phone || '',
        website: data.website || '',
        linkedin: data.linkedin || '',
      });
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

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

  const validateUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate URLs
    if (editForm.website && !validateUrl(editForm.website)) {
      toast.error('URL del sitio web no válida');
      return;
    }
    if (editForm.linkedin && !validateUrl(editForm.linkedin)) {
      toast.error('URL de LinkedIn no válida');
      return;
    }

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
        phone: editForm.phone || null,
        website: editForm.website || null,
        linkedin: editForm.linkedin || null,
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

  const hasContactInfo = profile.email || profile.phone || profile.website || profile.linkedin;

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
                  
                  {/* Contact fields section */}
                  <div className="border-t border-border pt-3">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Datos de contacto</p>
                    
                    {/* Email - Read only */}
                    <div className="relative mb-2">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={profile.email || ''}
                        readOnly
                        disabled
                        className="bg-muted pl-10 text-muted-foreground"
                        placeholder="Email (sincronizado con tu cuenta)"
                      />
                    </div>
                    
                    <div className="relative mb-2">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="pl-10"
                        placeholder="Teléfono (opcional)"
                      />
                    </div>
                    
                    <div className="relative mb-2">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={editForm.website}
                        onChange={(e) =>
                          setEditForm({ ...editForm, website: e.target.value })
                        }
                        className="pl-10"
                        placeholder="Sitio web (opcional)"
                      />
                    </div>
                    
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={editForm.linkedin}
                        onChange={(e) =>
                          setEditForm({ ...editForm, linkedin: e.target.value })
                        }
                        className="pl-10"
                        placeholder="LinkedIn (opcional)"
                      />
                    </div>
                  </div>
                  
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

          {/* Contact Info Section - Visible for all users */}
          {!isEditing && hasContactInfo && (
            <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="mb-3 text-sm font-semibold">Datos de contacto</h3>
              <div className="space-y-2">
                {profile.email && (
                  <a 
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </a>
                )}
                {profile.phone && (
                  <a 
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </a>
                )}
                {profile.website && (
                  <a 
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>{profile.website}</span>
                  </a>
                )}
                {profile.linkedin && (
                  <a 
                    href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="mt-4 flex flex-col gap-2">
              {isOwnProfile ? (
                <>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar perfil
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const profileUrl = `${window.location.origin}/profile/${profile.id}`;
                        navigator.clipboard.writeText(profileUrl);
                        toast.success('Enlace del perfil copiado');
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await signOut();
                      navigate('/auth');
                      toast.success('Sesión cerrada');
                    }}
                    className="w-full text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    const profileUrl = `${window.location.origin}/profile/${profile.id}`;
                    navigator.clipboard.writeText(profileUrl);
                    toast.success('Enlace del perfil copiado');
                  }}
                  className="w-full"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir perfil
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
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MoreVertical, Users, Info, Handshake, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import { usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/button';
import heroVideo from '@/assets/hero-2.mp4';
import headerLogo from '@/assets/header-logo.png';

export default function Feed() {
  const { posts, loading, error, refetch, toggleLike, deletePost } = usePosts();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <MainLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4">
          {videoEnded ? (
            <motion.img
              src={headerLogo}
              alt="VinkedIn"
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                duration: 0.6
              }}
              className="h-10 w-auto"
            />
          ) : (
            <h1 className="text-xl font-bold">Inicio</h1>
          )}
          <a href="/profile" className="absolute left-1/2 -translate-x-1/2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <a
                  href="https://vinculovirtual.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Comunidad
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://vinculovirtual.com/index.php/quienes-somos/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Info className="h-4 w-4" />
                  Quiénes somos
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://clearadviceconsulting.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Handshake className="h-4 w-4" />
                  Partners
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden">
        <video
          src={heroVideo}
          autoPlay
          muted
          playsInline
          onEnded={() => setVideoEnded(true)}
          className="w-full h-auto object-cover"
        />
        {videoEnded && (
          <div className="absolute inset-x-0 top-[15%] flex flex-col items-start px-6 md:px-12">
            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="font-bold text-gradient-brand"
              style={{ fontSize: 'clamp(1rem, 4vw, 2rem)' }}
            >
              Tu comunidad digital
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-bold text-gradient-brand"
              style={{ fontSize: 'clamp(1rem, 4vw, 2rem)' }}
            >
              de crecimiento empresarial
            </motion.p>
          </div>
        )}
      </section>

      {/* Content */}
      <div className="w-full md:mx-auto md:max-w-2xl md:px-4 md:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={refetch} variant="outline" className="mt-4">
              Reintentar
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-20 text-center"
          >
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-brand opacity-20" />
            <h2 className="text-xl font-semibold">No hay publicaciones aún</h2>
            <p className="mt-2 text-muted-foreground">
              ¡Sé el primero en compartir algo!
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 bg-gradient-brand text-white"
            >
              Crear publicación
            </Button>
          </motion.div>
        ) : (
          <div className="divide-y divide-border md:divide-y-0 md:space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={toggleLike}
                onRepost={() => {}}
                onDelete={deletePost}
                onUpdate={refetch}
              />
            ))}
          </div>
        )}
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetch}
      />
    </MainLayout>
  );
}

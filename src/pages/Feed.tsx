import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import { usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/button';
import heroVideo from '@/assets/hero-2.mp4';

export default function Feed() {
  const { posts, loading, error, refetch, toggleLike, deletePost } = usePosts();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <MainLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Inicio</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={refetch}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden">
        <video
          src={heroVideo}
          autoPlay
          muted
          playsInline
          className="w-full h-auto object-cover"
        />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute bottom-6 left-0 right-0 text-center font-bold px-4"
          style={{ 
            fontSize: 'clamp(0.75rem, 2.5vw, 1.4rem)',
            color: 'hsl(217 91% 60%)'
          }}
        >
          Tu hub de comunidad digital de crecimiento empresarial
        </motion.p>
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

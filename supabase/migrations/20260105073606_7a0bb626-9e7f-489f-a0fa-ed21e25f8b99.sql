-- Create post_favorites table
CREATE TABLE public.post_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE public.post_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Favorites are viewable by everyone" 
ON public.post_favorites 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add favorites" 
ON public.post_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their favorites" 
ON public.post_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_post_favorites_user_id ON public.post_favorites(user_id);
CREATE INDEX idx_post_favorites_post_id ON public.post_favorites(post_id);
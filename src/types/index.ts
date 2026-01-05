export interface Profile {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  company: string | null;
  role: string | null;
  tags: string[];
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  author: Profile;
  type: 'original' | 'repost';
  text: string | null;
  external_url: string | null;
  media_urls: string[];
  repost_of_id: string | null;
  repost_of?: Post | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  favorites_count: number;
  user_has_favorited: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user: Profile;
  text: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Profile[];
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Profile;
  text: string;
  created_at: string;
}

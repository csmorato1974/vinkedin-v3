import { supabase } from '@/integrations/supabase/client';

/**
 * Creates or returns an existing 1:1 conversation between the current
 * authenticated user and the target user. Uses a server-side SECURITY
 * DEFINER RPC so that adding the second participant is done atomically
 * and only via the sanctioned path — clients cannot directly insert
 * other users into conversation_participants.
 */
export async function getOrCreateConversation(
  _currentUserId: string,
  targetUserId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_conversation_with_user', {
    target_user_id: targetUserId,
  });

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  return (data as string) ?? null;
}

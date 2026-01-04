import { supabase } from '@/integrations/supabase/client';

export async function getOrCreateConversation(
  currentUserId: string,
  targetUserId: string
): Promise<string | null> {
  // Find existing conversation between these two users
  const { data: currentUserConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId);

  if (currentUserConvos && currentUserConvos.length > 0) {
    const conversationIds = currentUserConvos.map((p) => p.conversation_id);

    const { data: sharedConvo } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', targetUserId)
      .in('conversation_id', conversationIds)
      .limit(1)
      .maybeSingle();

    if (sharedConvo) {
      return sharedConvo.conversation_id;
    }
  }

  // Create new conversation
  const { data: newConvo, error: convoError } = await supabase
    .from('conversations')
    .insert({})
    .select('id')
    .single();

  if (convoError || !newConvo) {
    console.error('Error creating conversation:', convoError);
    return null;
  }

  // Add both participants
  const { error: participantsError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: newConvo.id, user_id: currentUserId },
      { conversation_id: newConvo.id, user_id: targetUserId },
    ]);

  if (participantsError) {
    console.error('Error adding participants:', participantsError);
    return null;
  }

  return newConvo.id;
}

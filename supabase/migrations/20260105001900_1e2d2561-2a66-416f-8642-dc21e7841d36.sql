
-- Drop and recreate the policy using the security definer function
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants in their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (public.is_conversation_participant(conversation_id));

-- Also fix the other policies that reference conversation_participants to use the function
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (public.is_conversation_participant(id));

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (public.is_conversation_participant(id));

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND public.is_conversation_participant(conversation_id));

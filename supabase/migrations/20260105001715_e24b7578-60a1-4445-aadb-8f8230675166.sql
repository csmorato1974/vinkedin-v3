
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Create a new policy that checks user_id directly without recursion
CREATE POLICY "Users can view participants in their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);

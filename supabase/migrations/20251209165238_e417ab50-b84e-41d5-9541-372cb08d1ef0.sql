-- Fix conversation_participants RLS policy (infinite recursion)
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants 
FOR SELECT 
USING (profile_id = get_my_profile_id());

-- Fix conversations RLS policy (infinite recursion)  
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" 
ON public.conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.profile_id = get_my_profile_id()
  )
);

-- Add unique constraint to story_views for upsert
ALTER TABLE public.story_views 
ADD CONSTRAINT story_views_story_viewer_unique 
UNIQUE (story_id, viewer_id);
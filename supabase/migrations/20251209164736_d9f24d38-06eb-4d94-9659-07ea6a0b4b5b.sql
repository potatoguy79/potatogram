-- Add verified badge columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_type TEXT CHECK (verified_type IN ('blue', 'red', 'gold') OR verified_type IS NULL),
ADD COLUMN IF NOT EXISTS badge_text TEXT;

-- Remove music columns from notes table
ALTER TABLE public.notes 
DROP COLUMN IF EXISTS music_track_name,
DROP COLUMN IF EXISTS music_artist,
DROP COLUMN IF EXISTS music_album_art;

-- Update posts RLS policy to respect privacy
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts viewable based on privacy" 
ON public.posts 
FOR SELECT 
USING (
  profile_id = get_my_profile_id() OR
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = posts.profile_id 
    AND profiles.is_private = true
  ) OR
  EXISTS (
    SELECT 1 FROM follows 
    WHERE follows.follower_id = get_my_profile_id() 
    AND follows.following_id = posts.profile_id
  )
);

-- Update stories RLS policy to respect privacy
DROP POLICY IF EXISTS "Users can view stories from people they follow" ON public.stories;
CREATE POLICY "Stories viewable based on privacy and follows" 
ON public.stories 
FOR SELECT 
USING (
  profile_id = get_my_profile_id() OR
  (
    (NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = stories.profile_id 
      AND profiles.is_private = true
    ) OR EXISTS (
      SELECT 1 FROM follows 
      WHERE follows.follower_id = get_my_profile_id() 
      AND follows.following_id = stories.profile_id
    ))
    AND
    (NOT is_close_friends_only OR EXISTS (
      SELECT 1 FROM close_friends 
      WHERE close_friends.user_id = stories.profile_id 
      AND close_friends.friend_id = get_my_profile_id()
    ))
  )
);

-- Update notes RLS policy to respect privacy  
DROP POLICY IF EXISTS "Users can view notes from people they follow" ON public.notes;
CREATE POLICY "Notes viewable based on privacy and follows" 
ON public.notes 
FOR SELECT 
USING (
  profile_id = get_my_profile_id() OR
  EXISTS (
    SELECT 1 FROM follows 
    WHERE follows.follower_id = get_my_profile_id() 
    AND follows.following_id = notes.profile_id
  )
);

-- Add UPDATE policy for messages (for read receipts)
CREATE POLICY "Users can update messages in their conversations" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = messages.conversation_id 
    AND conversation_participants.profile_id = get_my_profile_id()
  )
);

-- Set potato_guy79 as admin and verified
DO $$
DECLARE
  potato_profile_id UUID;
  potato_user_id UUID;
BEGIN
  -- Get the profile for potato_guy79
  SELECT id, user_id INTO potato_profile_id, potato_user_id
  FROM public.profiles 
  WHERE username = 'potato_guy79';
  
  IF potato_user_id IS NOT NULL THEN
    -- Set as admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (potato_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Set verified badge
    UPDATE public.profiles 
    SET is_verified = true, verified_type = 'blue', badge_text = 'Developer'
    WHERE id = potato_profile_id;
  END IF;
END $$;
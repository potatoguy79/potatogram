-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_private BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create close friends table
CREATE TABLE public.close_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation participants
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, profile_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notes table (like Instagram Notes)
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  music_track_name TEXT,
  music_artist TEXT,
  music_album_art TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create stories table
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  is_close_friends_only BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create story views table
CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create user settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  show_active_status BOOLEAN DEFAULT true,
  show_read_receipts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Follows policies
CREATE POLICY "Follows are viewable by authenticated users"
ON public.follows FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT TO authenticated
WITH CHECK (follower_id = public.get_my_profile_id());

CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE TO authenticated
USING (follower_id = public.get_my_profile_id());

-- Close friends policies
CREATE POLICY "Users can view own close friends"
ON public.close_friends FOR SELECT TO authenticated
USING (user_id = public.get_my_profile_id());

CREATE POLICY "Users can add close friends"
ON public.close_friends FOR INSERT TO authenticated
WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Users can remove close friends"
ON public.close_friends FOR DELETE TO authenticated
USING (user_id = public.get_my_profile_id());

-- Conversations policies
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND profile_id = public.get_my_profile_id()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.profile_id = public.get_my_profile_id()
  )
);

CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own participant record"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (profile_id = public.get_my_profile_id());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND profile_id = public.get_my_profile_id()
  )
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = public.get_my_profile_id());

-- Notes policies
CREATE POLICY "Users can view notes from people they follow"
ON public.notes FOR SELECT TO authenticated
USING (
  profile_id = public.get_my_profile_id() OR
  EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = public.get_my_profile_id() AND following_id = notes.profile_id
  )
);

CREATE POLICY "Users can create own notes"
ON public.notes FOR INSERT TO authenticated
WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can delete own notes"
ON public.notes FOR DELETE TO authenticated
USING (profile_id = public.get_my_profile_id());

-- Stories policies
CREATE POLICY "Users can view stories from people they follow"
ON public.stories FOR SELECT TO authenticated
USING (
  profile_id = public.get_my_profile_id() OR
  (
    EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = public.get_my_profile_id() AND following_id = stories.profile_id
    )
    AND (
      NOT is_close_friends_only OR
      EXISTS (
        SELECT 1 FROM public.close_friends
        WHERE user_id = stories.profile_id AND friend_id = public.get_my_profile_id()
      )
    )
  )
);

CREATE POLICY "Users can create own stories"
ON public.stories FOR INSERT TO authenticated
WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can delete own stories"
ON public.stories FOR DELETE TO authenticated
USING (profile_id = public.get_my_profile_id());

-- Story views policies
CREATE POLICY "Story owners can view who viewed"
ON public.story_views FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = story_id AND profile_id = public.get_my_profile_id()
  ) OR viewer_id = public.get_my_profile_id()
);

CREATE POLICY "Users can mark stories as viewed"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = public.get_my_profile_id());

-- User settings policies
CREATE POLICY "Users can view own settings"
ON public.user_settings FOR SELECT TO authenticated
USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can update own settings"
ON public.user_settings FOR UPDATE TO authenticated
USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can insert own settings"
ON public.user_settings FOR INSERT TO authenticated
WITH CHECK (profile_id = public.get_my_profile_id());

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'display_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_settings (profile_id)
  SELECT id FROM public.profiles WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
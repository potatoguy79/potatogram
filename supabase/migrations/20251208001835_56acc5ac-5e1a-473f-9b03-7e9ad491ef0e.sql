-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post_likes table
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- Create post_comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post_saves table
CREATE TABLE public.post_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- Create post_tags table
CREATE TABLE public.post_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, tagged_profile_id)
);

-- Create story_likes table
CREATE TABLE public.story_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, profile_id)
);

-- Create story_comments table
CREATE TABLE public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create note_likes table
CREATE TABLE public.note_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(note_id, profile_id)
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create message_requests table
CREATE TABLE public.message_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT,
  content_id UUID,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (profile_id = get_my_profile_id());
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (profile_id = get_my_profile_id());

-- Post likes policies
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (profile_id = get_my_profile_id());

-- Post comments policies
CREATE POLICY "Post comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment on posts" ON public.post_comments FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (profile_id = get_my_profile_id());

-- Post saves policies
CREATE POLICY "Users can view own saves" ON public.post_saves FOR SELECT USING (profile_id = get_my_profile_id());
CREATE POLICY "Users can save posts" ON public.post_saves FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can unsave posts" ON public.post_saves FOR DELETE USING (profile_id = get_my_profile_id());

-- Post tags policies
CREATE POLICY "Post tags are viewable by everyone" ON public.post_tags FOR SELECT USING (true);
CREATE POLICY "Post owner can tag users" ON public.post_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND profile_id = get_my_profile_id())
);
CREATE POLICY "Post owner can remove tags" ON public.post_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND profile_id = get_my_profile_id())
);

-- Story likes policies
CREATE POLICY "Story likes viewable by story owner" ON public.story_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND profile_id = get_my_profile_id()) OR profile_id = get_my_profile_id()
);
CREATE POLICY "Users can like stories" ON public.story_likes FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can unlike stories" ON public.story_likes FOR DELETE USING (profile_id = get_my_profile_id());

-- Story comments policies
CREATE POLICY "Story comments viewable by story owner" ON public.story_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND profile_id = get_my_profile_id()) OR profile_id = get_my_profile_id()
);
CREATE POLICY "Users can comment on stories" ON public.story_comments FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can delete own story comments" ON public.story_comments FOR DELETE USING (profile_id = get_my_profile_id());

-- Note likes policies
CREATE POLICY "Note likes are viewable" ON public.note_likes FOR SELECT USING (true);
CREATE POLICY "Users can like notes" ON public.note_likes FOR INSERT WITH CHECK (profile_id = get_my_profile_id());
CREATE POLICY "Users can unlike notes" ON public.note_likes FOR DELETE USING (profile_id = get_my_profile_id());

-- Reports policies
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (reporter_id = get_my_profile_id());

-- Message requests policies
CREATE POLICY "Users can view own message requests" ON public.message_requests FOR SELECT USING (sender_id = get_my_profile_id() OR receiver_id = get_my_profile_id());
CREATE POLICY "Users can send message requests" ON public.message_requests FOR INSERT WITH CHECK (sender_id = get_my_profile_id());
CREATE POLICY "Receiver can update message request" ON public.message_requests FOR UPDATE USING (receiver_id = get_my_profile_id());
CREATE POLICY "Users can delete own requests" ON public.message_requests FOR DELETE USING (sender_id = get_my_profile_id() OR receiver_id = get_my_profile_id());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (profile_id = get_my_profile_id());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (profile_id = get_my_profile_id());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (profile_id = get_my_profile_id());

-- Create storage bucket for profile pictures and posts
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for posts bucket
CREATE POLICY "Post images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Users can upload post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete post images" ON storage.objects FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for stories bucket
CREATE POLICY "Story media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Users can upload story media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete story media" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
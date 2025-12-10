import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { X, ChevronLeft, ChevronRight, User, Heart, Send, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  is_close_friends_only: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface StoryViewerProps {
  stories: Story[];
  profile: Profile;
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, profile, onClose }) => {
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');

  const currentStory = stories[currentIndex];

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && myProfile?.id && profile.id !== myProfile.id) {
      supabase.from('story_views').upsert({ story_id: currentStory.id, viewer_id: myProfile.id }, { onConflict: 'story_id,viewer_id' }).then();
      
      // Check if liked
      supabase.from('story_likes').select('id').eq('story_id', currentStory.id).eq('profile_id', myProfile.id).maybeSingle().then(({ data }) => {
        setIsLiked(!!data);
      });
    }
  }, [currentStory, myProfile?.id, profile.id]);

  // Progress bar and auto-advance
  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    setProgress(0);
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, stories.length, onClose]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!myProfile?.id || !currentStory) return;
      if (isLiked) {
        await supabase.from('story_likes').delete().eq('story_id', currentStory.id).eq('profile_id', myProfile.id);
      } else {
        await supabase.from('story_likes').insert({ story_id: currentStory.id, profile_id: myProfile.id });
        if (profile.id !== myProfile.id) {
          await supabase.from('notifications').insert({ profile_id: profile.id, type: 'like', actor_id: myProfile.id, content_type: 'story', content_id: currentStory.id });
        }
      }
    },
    onSuccess: () => setIsLiked(!isLiked),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!myProfile?.id || !currentStory || !comment.trim()) return;
      await supabase.from('story_comments').insert({ story_id: currentStory.id, profile_id: myProfile.id, content: comment.trim() });
      if (profile.id !== myProfile.id) {
        await supabase.from('notifications').insert({ profile_id: profile.id, type: 'comment', actor_id: myProfile.id, content_type: 'story', content_id: currentStory.id, message: comment.trim() });
      }
    },
    onSuccess: () => {
      setComment('');
      toast({ title: 'Reply sent!' });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!myProfile?.id || !currentStory) return;
      await supabase.from('reports').insert({ reporter_id: myProfile.id, content_type: 'story', content_id: currentStory.id, reason: 'Reported by user' });
    },
    onSuccess: () => toast({ title: 'Story reported. Admins will review it.' }),
  });

  const goNext = () => { if (currentIndex < stories.length - 1) setCurrentIndex(i => i + 1); else onClose(); };
  const goPrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 hover:bg-white/10 rounded-full transition-colors">
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="relative w-full max-w-md h-full max-h-[90vh] bg-black">
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-40">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className={cn('h-full bg-white transition-all duration-100', idx < currentIndex ? 'w-full' : idx === currentIndex ? '' : 'w-0')} style={{ width: idx === currentIndex ? `${progress}%` : undefined }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-10 left-4 right-4 z-40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <span className="text-white text-sm font-medium">{profile.username}</span>
            <span className="text-white/60 text-sm ml-2">{formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}</span>
          </div>
          {currentStory.is_close_friends_only && <span className="text-xs bg-close-friends text-white px-2 py-0.5 rounded-full">Close Friends</span>}
          <button onClick={() => reportMutation.mutate()} className="p-1 hover:bg-white/10 rounded-full"><Flag className="w-4 h-4 text-white" /></button>
        </div>

        {/* Navigation areas */}
        <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 z-30" />
        <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 z-30" />

        {/* Story content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStory.media_type === 'video' ? (
            <video src={currentStory.media_url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
          ) : (
            <img src={currentStory.media_url} alt="Story" className="w-full h-full object-contain" onLoad={() => setProgress(0)} />
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4 z-40 flex items-center gap-3">
          <Input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Send message"
            className="flex-1 bg-transparent border border-white/30 rounded-full text-white placeholder:text-white/50"
            onKeyDown={e => e.key === 'Enter' && comment.trim() && commentMutation.mutate()}
          />
          <button onClick={() => likeMutation.mutate()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Heart className={cn("w-6 h-6 text-white", isLiked && "fill-destructive text-destructive")} />
          </button>
          <button onClick={() => comment.trim() && commentMutation.mutate()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Send className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-40"><ChevronLeft className="w-5 h-5 text-white" /></button>}
        {currentIndex < stories.length - 1 && <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-40"><ChevronRight className="w-5 h-5 text-white" /></button>}
      </div>
    </div>
  );
};

export default StoryViewer;
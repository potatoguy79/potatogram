import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User, Plus } from 'lucide-react';
import StoryViewer from './StoryViewer';
import CreateStoryDialog from './CreateStoryDialog';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  is_close_friends_only: boolean;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface GroupedStories {
  profile: Story['profile'];
  stories: Story[];
  hasUnviewed: boolean;
  isCloseFriend: boolean;
}

const StoriesBar: React.FC = () => {
  const { profile } = useAuth();
  const [viewingStories, setViewingStories] = useState<GroupedStories | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: groupedStories = [] } = useQuery({
    queryKey: ['stories', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get viewed stories
      const { data: viewedData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', profile.id);

      const viewedIds = new Set((viewedData || []).map(v => v.story_id));

      // Get close friends
      const { data: closeFriendsData } = await supabase
        .from('close_friends')
        .select('user_id')
        .eq('friend_id', profile.id);

      const closeFriendIds = new Set((closeFriendsData || []).map(cf => cf.user_id));

      // Group by profile
      const grouped: Record<string, GroupedStories> = {};
      
      (data as Story[]).forEach(story => {
        const profileId = story.profile.id;
        if (!grouped[profileId]) {
          grouped[profileId] = {
            profile: story.profile,
            stories: [],
            hasUnviewed: false,
            isCloseFriend: closeFriendIds.has(profileId),
          };
        }
        grouped[profileId].stories.push(story);
        if (!viewedIds.has(story.id)) {
          grouped[profileId].hasUnviewed = true;
        }
      });

      // Sort: unviewed first, then by most recent story
      return Object.values(grouped).sort((a, b) => {
        if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
        const aTime = new Date(a.stories[a.stories.length - 1].created_at).getTime();
        const bTime = new Date(b.stories[b.stories.length - 1].created_at).getTime();
        return bTime - aTime;
      });
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const myStories = groupedStories.find(g => g.profile.id === profile?.id);
  const otherStories = groupedStories.filter(g => g.profile.id !== profile?.id);

  return (
    <>
      <div className="flex gap-4 px-4 py-4 overflow-x-auto scrollbar-thin border-b border-border">
        {/* Add story */}
        <button
          onClick={() => setCreateOpen(true)}
          className="flex flex-col items-center gap-1 min-w-fit"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xs">Your story</span>
        </button>

        {/* My stories if I have any */}
        {myStories && myStories.stories.length > 0 && (
          <button
            onClick={() => setViewingStories(myStories)}
            className="flex flex-col items-center gap-1 min-w-fit"
          >
            <div className={myStories.hasUnviewed ? 'story-ring' : ''}>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-background">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile?.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>
            <span className="text-xs truncate max-w-16">My story</span>
          </button>
        )}

        {/* Other users' stories */}
        {otherStories.map(group => (
          <button
            key={group.profile.id}
            onClick={() => setViewingStories(group)}
            className="flex flex-col items-center gap-1 min-w-fit"
          >
            <div className={group.hasUnviewed 
              ? (group.isCloseFriend ? 'story-ring-close-friends' : 'story-ring') 
              : ''
            }>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-background">
                {group.profile.avatar_url ? (
                  <img 
                    src={group.profile.avatar_url} 
                    alt={group.profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>
            <span className="text-xs truncate max-w-16">{group.profile.username}</span>
          </button>
        ))}
      </div>

      {viewingStories && (
        <StoryViewer
          stories={viewingStories.stories}
          profile={viewingStories.profile}
          onClose={() => setViewingStories(null)}
        />
      )}

      <CreateStoryDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
};

export default StoriesBar;
